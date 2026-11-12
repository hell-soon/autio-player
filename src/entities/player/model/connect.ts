/**
 * «Подключение устройств» (как Spotify Connect, но для этого сайта и любых треков):
 * каждое открытое окно — устройство. Устройства раз в несколько секунд синхронизируются
 * через сервер: сообщают, что играют, и забирают адресованные им команды.
 * Если играет другое ваше устройство, этот плеер становится пультом для него.
 */

/** То, что модуль подключения умеет делать с локальным плеером. */
export interface LocalPlayerApi {
  state: () => DeviceState | null
  isPlaying: () => boolean
  /** Снимок очереди для переноса на другое устройство */
  snapshot: () => { queue: Track[], index: number, positionMs: number, radio: DeviceRadio | null } | null
  execute: (cmd: DeviceCommand) => void
  pauseLocal: () => void
  /** Разблокировать звук в жесте пользователя (iOS), пока ждём команду с очередью */
  unlock: () => void
}

const ID_KEY = 'device:id'

function deviceId() {
  try {
    let id = localStorage.getItem(ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(ID_KEY, id)
    }
    return id
  }
  catch {
    return crypto.randomUUID()
  }
}

function describeDevice(): { name: string, kind: DeviceKind } {
  const ua = navigator.userAgent
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  const os = /iPhone/.test(ua) ? 'iPhone'
    : /iPad/.test(ua) || iPadOS ? 'iPad'
      : /Android/.test(ua) ? 'Android'
        : /Mac/.test(ua) ? 'Mac'
          : /Windows/.test(ua) ? 'Windows'
            : /Linux/.test(ua) ? 'Linux' : 'Устройство'
  const browser = /YaBrowser/.test(ua) ? 'Яндекс Браузер'
    : /Edg\//.test(ua) ? 'Edge'
      : /Firefox|FxiOS/.test(ua) ? 'Firefox'
        : /Chrome|CriOS/.test(ua) ? 'Chrome'
          : /Safari/.test(ua) ? 'Safari' : ''
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone
  const kind: DeviceKind = os === 'iPhone' || (os === 'Android' && /Mobile/.test(ua)) ? 'phone'
    : os === 'iPad' || os === 'Android' ? 'tablet' : 'computer'
  return { name: [os, standalone ? 'приложение' : browser].filter(Boolean).join(' · '), kind }
}

export function createConnect(local: LocalPlayerApi) {
  const selfId = ref('')
  const devices = ref<DeviceInfo[]>([])
  /** Устройство, которым мы сейчас управляем (null — играем сами) */
  const controlling = ref<string | null>(null)
  /** Пользователь сам выбрал «играть здесь» — не переключаемся автоматически на чужое воспроизведение */
  let pinnedLocal = false
  const clockOffset = ref(0)
  const now = ref(Date.now())

  // Устройства Spotify Connect (колонки, приложение Spotify) — "sp:<id>", управляются через Web API Spotify.
  const spotifyDevices = ref<DeviceInfo[]>([])
  const spotifyState = ref<DeviceState | null>(null)
  const isSp = (id: string | null | undefined) => !!id?.startsWith('sp:')
  let spTimer: ReturnType<typeof setTimeout> | undefined

  const allDevices = computed<DeviceInfo[]>(() => [
    ...devices.value,
    ...spotifyDevices.value.map(d => (d.id === controlling.value ? { ...d, state: spotifyState.value } : d)),
  ])

  const remote = computed(() => (controlling.value ? allDevices.value.find(d => d.id === controlling.value) ?? null : null))
  const remoteState = computed(() => remote.value?.state ?? null)
  const remotePosition = computed(() => {
    const s = remoteState.value
    if (!s) return 0
    if (!s.isPlaying) return s.positionMs
    return Math.min(s.durationMs || Infinity, s.positionMs + (now.value + clockOffset.value - s.at))
  })

  let timer: ReturnType<typeof setTimeout> | undefined
  let syncing = false
  let started = false
  let desc = { name: '', kind: 'computer' as DeviceKind }

  async function sync() {
    if (syncing) return
    syncing = true
    try {
      const res = await $fetch<DeviceSyncResponse>('/api/devices/sync', {
        method: 'POST',
        body: { id: selfId.value, name: desc.name, kind: desc.kind, state: local.state() },
      })
      clockOffset.value = res.serverTime - Date.now()
      devices.value = res.devices
      for (const cmd of res.commands) {
        // Нам передали воспроизведение — мы больше не пульт.
        if (cmd.type === 'play-queue') {
          setControlling(null)
          pinnedLocal = false
        }
        local.execute(cmd)
      }
      followRemote()
    }
    catch {
      // нет сети / сессия истекла — попробуем позже
    }
    finally {
      syncing = false
      schedule()
    }
  }

  /** Автоматически становимся пультом, если играет другое устройство, а мы — нет. */
  function followRemote() {
    const others = devices.value.filter(d => d.id !== selfId.value)
    if (controlling.value && !isSp(controlling.value) && !others.some(d => d.id === controlling.value)) controlling.value = null
    if (controlling.value || pinnedLocal || local.isPlaying()) return
    const playing = others.filter(d => d.state?.isPlaying).sort((a, b) => (b.state!.at - a.state!.at))[0]
    if (playing) setControlling(playing.id)
  }

  function schedule(ms?: number) {
    clearTimeout(timer)
    const active = local.isPlaying() || controlling.value
    const delay = ms ?? (document.hidden ? (active ? 5000 : 20_000) : 2500)
    timer = setTimeout(sync, delay)
  }

  function send(target: string, command: DeviceCommand) {
    if (isSp(target)) {
      return $fetch('/api/spotify/connect/command', { method: 'POST', body: { deviceId: target.slice(3), command } })
        .then(() => pollSpotify(700))
        .catch(() => {})
    }
    return $fetch('/api/devices/command', { method: 'POST', body: { target, command } })
      .then(() => schedule(600)) // результат команды увидим быстрее
      .catch(() => {})
  }

  /** Состояние Spotify, пока управляем устройством Spotify Connect. */
  function pollSpotify(ms = 0) {
    clearTimeout(spTimer)
    if (!isSp(controlling.value)) return
    spTimer = setTimeout(async () => {
      try {
        const st = await $fetch<(DeviceState & { deviceId: string | null }) | null>('/api/spotify/connect/state')
        if (st) spotifyState.value = st
      }
      catch {}
      pollSpotify(document.hidden ? 8000 : 2500)
    }, ms)
  }

  async function loadSpotifyDevices() {
    try {
      spotifyDevices.value = await $fetch<DeviceInfo[]>('/api/spotify/connect/devices')
    }
    catch {
      spotifyDevices.value = []
    }
  }

  function setControlling(id: string | null) {
    controlling.value = id
    if (isSp(id)) {
      spotifyState.value = null
      pollSpotify(0)
    }
    else {
      clearTimeout(spTimer)
    }
  }

  /** Команда устройству, которым управляем. Возвращает false, если играем сами. */
  function control(command: DeviceCommand) {
    if (!controlling.value) return false
    // Оптимистично обновляем вид пульта, не дожидаясь синхронизации.
    const d = remote.value
    if (d?.state) {
      const s = { ...d.state }
      const pos = remotePosition.value
      if (command.type === 'pause') Object.assign(s, { isPlaying: false, positionMs: pos, at: now.value + clockOffset.value })
      if (command.type === 'resume') Object.assign(s, { isPlaying: true, positionMs: pos, at: now.value + clockOffset.value })
      if (command.type === 'seek') Object.assign(s, { positionMs: command.ms, at: now.value + clockOffset.value })
      if (command.type === 'volume') s.volume = command.value
      d.state = s
    }
    void send(controlling.value, command)
    return true
  }

  /** Перенести воспроизведение на устройство (в том числе сюда). Вызывать из клика. */
  function transferTo(target: string) {
    const from = controlling.value
    if (target === selfId.value) {
      pinnedLocal = true
      if (!from) return
      local.unlock() // звук запустится не из жеста — разблокируем заранее (iOS)
      if (isSp(from)) {
        // Забираем трек и позицию из Spotify, ставим там паузу и продолжаем здесь.
        const st = spotifyState.value
        setControlling(null)
        void send(from, { type: 'pause' })
        if (st?.track) {
          const pos = st.isPlaying ? st.positionMs + (now.value + clockOffset.value - st.at) : st.positionMs
          local.execute({ type: 'play-queue', queue: [st.track], index: 0, positionMs: Math.max(0, pos), play: true })
        }
      }
      else {
        void send(from, { type: 'handoff', to: selfId.value })
        setControlling(null)
      }
      return
    }

    pinnedLocal = false
    if (from && isSp(from)) {
      // С одного устройства Spotify на другое (или на устройство сайта) — текущим треком с позиции.
      const st = spotifyState.value
      if (st?.track) {
        void send(target, { type: 'play-queue', queue: [st.track], index: 0, positionMs: st.positionMs, play: true })
        if (!isSp(target)) void send(from, { type: 'pause' })
      }
    }
    else if (from && from !== target) {
      void send(from, { type: 'handoff', to: target })
    }
    else if (!from) {
      const snap = local.snapshot()
      if (snap) {
        void send(target, { type: 'play-queue', ...snap, play: true })
        local.pauseLocal()
      }
    }
    setControlling(target)
  }

  /** Выполнить handoff: отправить свою очередь устройству `to` и остановиться. */
  function handoff(to: string) {
    const snap = local.snapshot()
    if (!snap) return
    void send(to, { type: 'play-queue', ...snap, play: true })
    local.pauseLocal()
    if (to !== selfId.value) setControlling(to)
  }

  function start() {
    if (started || import.meta.server) return
    started = true
    selfId.value = deviceId()
    desc = describeDevice()
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) schedule(0)
    })
    setInterval(() => (now.value = Date.now()), 500)
    schedule(0)
  }

  /** Пользователь сам запустил что-то здесь — перестаём следовать за чужим воспроизведением. */
  function pinLocal() {
    pinnedLocal = true
  }

  return {
    selfId: readonly(selfId),
    devices: allDevices,
    loadSpotifyDevices,
    controlling: readonly(controlling),
    remote,
    remoteState,
    remotePosition,
    control,
    transferTo,
    handoff,
    pinLocal,
    start,
  }
}
