import { isMobileBrowser } from '@/shared/lib'
import type { AnalyserStatus } from '../lib/analyser'
import type { EngineCallbacks, EngineKind } from '../lib/types'
import { createYandexEngine, type YandexEngine } from '../lib/yandex-engine'
import {
  initSpotify,
  spotifyEngine,
  spotifyError,
  spotifyLivePosition,
  spotifyPlay,
  spotifyStatus,
} from '../lib/spotify-engine'
import {
  setMediaHandlers,
  setMediaMetadata,
  setMediaPlaybackState,
  setMediaPosition,
} from '../lib/media-session'
import { createConnect } from './connect'

/**
 * Единый плеер: одна очередь, два движка.
 *  - трек Яндекса → <audio>;
 *  - трек Spotify → Web Playback SDK, если он готов (десктоп), иначе → тот же трек из Яндекса.
 * Состояние — модульный синглтон: изменяется только на клиенте.
 */

export type RepeatMode = 'off' | 'all' | 'one'

const queue = ref<Track[]>([])
const index = ref(-1)
const current = computed<Track | null>(() => queue.value[index.value] ?? null)
const isPlaying = ref(false)
const buffering = ref(false)
const position = ref(0)
const duration = ref(0)
const volume = ref(0.8)
const muted = ref(false)
const repeat = ref<RepeatMode>('off')
const error = ref('')
const engine = ref<EngineKind | null>(null)

let yandex: YandexEngine | null = null
/** Ревизия очереди: меняется при любой замене массива (для отправки снимка на сервер) */
let queueRev = 0
watch(queue, () => queueRev++)
/** Позиция, с которой начать после восстановления («продолжить с того же места») */
let pendingStartMs = 0
let ticker: ReturnType<typeof setInterval> | undefined

/** Визуализатор: включён ли в настройках и работает ли сейчас (CDN может не разрешить CORS) */
const visualizer = ref(false)
const analyserStatus = ref<AnalyserStatus>('off')
/** Только компьютер: на телефонах Web Audio обрывает звук в фоне и на экране блокировки */
const visualizerSupported = () => import.meta.client && !isMobileBrowser() && typeof AudioContext !== 'undefined'

/** Сколько недоступных треков подряд пропущено (сбрасывается, когда что-то заиграло) */
let skipStreak = 0

const callbacks: EngineCallbacks = {
  onAnalyser: s => (analyserStatus.value = s),
  onPlaying(p) {
    isPlaying.value = p
    if (p) {
      skipStreak = 0
      error.value = ''
    }
    setMediaPlaybackState(p)
  },
  onTime(pos, dur) {
    position.value = pos
    if (dur) duration.value = dur
  },
  onBuffering: b => (buffering.value = b),
  onEnded: () => {
    if (sleepAt.value === 'track') {
      sleepAt.value = null
      pause()
      return
    }
    next(true)
  },
  onError(msg, skippable) {
    error.value = msg
    isPlaying.value = false
    // Недоступный трек — как в Spotify/Яндексе: сами переходим к следующему.
    // Не больше трёх подряд: если пропала сеть, не перебираем всю очередь.
    if (skippable && skipStreak < 3 && index.value < queue.value.length - 1) {
      skipStreak++
      error.value = 'Трек недоступен — включаю следующий'
      const at = index.value
      setTimeout(() => {
        if (index.value === at) next()
      }, 1200)
    }
  },
}

function getYandex() {
  yandex ??= createYandexEngine(callbacks)
  yandex.setVolume(muted.value ? 0 : volume.value)
  return yandex
}

// ---------- Предзагрузка и кроссфейд ----------

/** Длительность кроссфейда, мс (0 — без кроссфейда, только бесшовный переход) */
const crossfade = ref(0)
const PRELOAD_BEFORE_END_MS = 30_000

/** Следующий трек заранее грузится во второй <audio>; кроссфейд — только между треками Яндекс-движка. */
function preloadNext() {
  if (!yandex || engine.value !== 'yandex' || !isPlaying.value || repeat.value === 'one') return
  const nextTrack = queue.value[index.value + 1]
  const nextOnYandex = !!nextTrack && pickEngine(nextTrack) === 'yandex'
  yandex.setCrossfade(nextOnYandex ? crossfade.value : 0)
  if (nextOnYandex && duration.value - position.value <= PRELOAD_BEFORE_END_MS) yandex.preload(yandexSrc(nextTrack))
}

/** Вызывать из клика: браузер запускает Web Audio только из жеста пользователя. */
function setVisualizer(on: boolean) {
  visualizer.value = on && visualizerSupported()
  getYandex().setAnalyser(visualizer.value)
  try {
    localStorage.setItem('player:visualizer', on ? '1' : '0')
  }
  catch {}
}

function setCrossfade(ms: number) {
  crossfade.value = ms
  try {
    localStorage.setItem('player:crossfade', String(ms))
  }
  catch {}
}

function yandexSrc(t: Track) {
  if (t.source === 'yandex') return `/api/yandex/stream/${encodeURIComponent(t.sourceId)}`
  // Трек Spotify → ищем этот же трек в Яндексе и сразу получаем поток (один запрос, без await в клике).
  const q = new URLSearchParams({ title: t.title, artists: t.artists.join('|'), durationMs: String(t.durationMs) })
  return `/api/yandex/match-stream?${q}`
}

/** «Только Яндекс» в настройках: даже треки Spotify играют через совпадение в Яндексе */
const onlyYandex = ref(false)
function setMusicServices(s: MusicServices) {
  onlyYandex.value = s === 'yandex'
}

function pickEngine(t: Track): EngineKind {
  return t.source === 'spotify' && spotifyStatus.value === 'ready' && !onlyYandex.value ? 'spotify' : 'yandex'
}

/** Запуск текущего трека. Синхронный до старта звука — можно вызывать из обработчика клика. */
function startCurrent(startMs = 0) {
  const t = current.value
  if (!t) return
  pendingStartMs = 0
  error.value = ''
  position.value = startMs
  duration.value = t.durationMs

  const kind = pickEngine(t)
  if (engine.value && engine.value !== kind) stopEngine(engine.value)
  engine.value = kind

  if (kind === 'spotify') {
    spotifyPlay(t.sourceId, startMs).catch((e: any) => callbacks.onError(e?.data?.message || e?.message || 'Ошибка Spotify'))
  }
  else {
    getYandex().load(yandexSrc(t), startMs)
  }
  setMediaMetadata(t)
  // Последний трек очереди — заранее подгружаем продолжение, чтобы не было паузы.
  if (autoplay.value && index.value >= queue.value.length - 1) void fetchMore()
}

// ---------- Подбор музыки (радио Яндекса) ----------

/** Продолжать похожей музыкой, когда очередь закончилась. */
const autoplay = ref(true)
/**
 * Источник радио: «Моя волна», станция или исполнитель — продолжение берём из него же.
 * null — обычная очередь (в конце подбираем похожее на последний трек).
 */
export type RadioSource =
  | { station: 'wave' }
  | { station: 'id', id: string, name?: string }
  | { station: 'artist', name: string }
const radioSource = ref<RadioSource | null>(null)
/** Совместимость: 'wave', если играет «Моя волна». */
const radioStation = computed(() => (radioSource.value?.station === 'wave' ? 'wave' as const : null))
const radioLoading = ref(false)
let pendingMore: Promise<Track[]> | null = null

function fetchMore(): Promise<Track[]> {
  if (pendingMore) return pendingMore
  const seed = queue.value.at(-1)
  if (!seed && !radioSource.value) return Promise.resolve([])
  radioLoading.value = true
  pendingMore = $fetch<Track[]>('/api/radio', {
    method: 'POST',
    body: {
      ...(radioSource.value ?? { station: 'similar', seed }),
      exclude: queue.value.slice(-200).map(t => t.uid),
    },
  })
    .then((more) => {
      if (more.length) {
        queue.value = [...queue.value, ...more]
        originalQueue.push(...more)
      }
      return more
    })
    .catch(() => [] as Track[])
    .finally(() => {
      pendingMore = null
      radioLoading.value = false
    })
  return pendingMore
}

/** Запуск радио (волна / станция / исполнитель). Вызывается из клика. */
async function startRadio(source: RadioSource) {
  // Разблокируем звук до сетевого запроса (iOS разрешает старт только из жеста).
  getYandex().unlock()
  radioSource.value = source
  radioLoading.value = true
  try {
    const tracks = await $fetch<Track[]>('/api/radio', { method: 'POST', body: source })
    if (!tracks.length) throw new Error('Станция пуста')
    playQueue(tracks, 0, { shuffle: false, keepRadio: true })
  }
  catch (e: any) {
    error.value = e?.data?.message || 'Не удалось запустить радио'
    radioSource.value = null
  }
  finally {
    radioLoading.value = false
  }
}

const startWave = () => startRadio({ station: 'wave' })

function setAutoplay(v: boolean) {
  autoplay.value = v
  try {
    localStorage.setItem('player:autoplay', v ? '1' : '0')
  }
  catch {}
}

function stopEngine(kind: EngineKind) {
  if (kind === 'spotify') spotifyEngine.stop()
  else yandex?.stop()
}

const shuffle = ref(false)
/** Исходный порядок очереди — чтобы вернуть его при выключении перемешивания. */
let originalQueue: Track[] = []

function shuffled<T>(arr: T[]) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function playQueue(tracks: Track[], startIndex = 0, opts: { shuffle?: boolean, keepRadio?: boolean } = {}) {
  if (!opts.keepRadio) radioSource.value = null
  if (opts.shuffle !== undefined) shuffle.value = opts.shuffle
  originalQueue = tracks.slice()
  if (shuffle.value) {
    // Выбранный трек (или случайный при «Перемешать») — первым, остальные вперемешку.
    const first = opts.shuffle ? Math.floor(Math.random() * tracks.length) : startIndex
    const rest = tracks.filter((_, i) => i !== first)
    queue.value = [tracks[first]!, ...shuffled(rest)]
    index.value = 0
  }
  else {
    queue.value = tracks.slice()
    index.value = startIndex
  }
  startCurrent()
}

function toggleShuffle() {
  shuffle.value = !shuffle.value
  const cur = current.value
  if (!cur) return
  if (shuffle.value) {
    originalQueue = queue.value.slice()
    const rest = queue.value.filter((_, i) => i !== index.value)
    queue.value = [cur, ...shuffled(rest)]
    index.value = 0
  }
  else if (originalQueue.length) {
    queue.value = originalQueue.slice()
    index.value = Math.max(0, queue.value.findIndex(t => t.uid === cur.uid))
  }
}

/** Вставить сразу после текущего трека. */
function playNext(t: Track) {
  if (!current.value) return playQueue([t])
  const q = queue.value.slice()
  q.splice(index.value + 1, 0, t)
  queue.value = q
  originalQueue.push(t)
}

/** В конец очереди. */
function addToQueue(list: Track[]) {
  if (!current.value) return playQueue(list)
  queue.value = [...queue.value, ...list]
  originalQueue.push(...list)
}

function playAt(i: number) {
  if (i < 0 || i >= queue.value.length) return
  index.value = i
  startCurrent()
}

function resume() {
  if (!current.value) return
  if (!engine.value) return startCurrent(pendingStartMs)
  if (engine.value === 'spotify') spotifyEngine.resume()
  else getYandex().resume()
}

function pause() {
  if (engine.value === 'spotify') spotifyEngine.pause()
  else yandex?.pause()
}

function toggle() {
  if (isPlaying.value) pause()
  else resume()
}

function next(auto = false) {
  if (!queue.value.length) return
  if (auto && repeat.value === 'one') {
    seek(0)
    resume()
    return
  }
  if (index.value < queue.value.length - 1) {
    index.value++
  }
  else if (repeat.value === 'all') {
    index.value = 0
  }
  else if (autoplay.value) {
    // Конец очереди: продолжаем похожей музыкой (продолжение обычно уже подгружено заранее).
    const from = index.value
    void fetchMore().then((more) => {
      if (!more.length || index.value !== from) {
        if (!more.length) isPlaying.value = false
        return
      }
      index.value = from + 1
      startCurrent()
    })
    return
  }
  else {
    // Конец очереди: останавливаемся на последнем треке.
    isPlaying.value = false
    return
  }
  startCurrent()
}

function previous() {
  // Как в привычных плеерах: если трек играет дольше 3 с — сначала в начало.
  if (position.value > 3000 || index.value <= 0) {
    seek(0)
    return
  }
  index.value--
  startCurrent()
}

function seek(ms: number) {
  position.value = ms
  if (engine.value === 'spotify') spotifyEngine.seek(ms)
  else yandex?.seek(ms)
}

function applyVolume() {
  const v = muted.value ? 0 : volume.value
  yandex?.setVolume(v)
  spotifyEngine.setVolume(v)
  try {
    localStorage.setItem('player:volume', String(volume.value))
  }
  catch {}
}

function setVolume(v: number) {
  volume.value = Math.min(1, Math.max(0, v))
  muted.value = volume.value === 0
  applyVolume()
}

function toggleMute() {
  muted.value = !muted.value
  if (!muted.value && volume.value === 0) volume.value = 0.5
  applyVolume()
}

function cycleRepeat() {
  repeat.value = repeat.value === 'off' ? 'all' : repeat.value === 'all' ? 'one' : 'off'
}

// ---------- Таймер сна ----------

/** Когда поставить паузу (unix ms) или 'track' — после текущего трека */
const sleepAt = ref<number | 'track' | null>(null)
let sleepTimer: ReturnType<typeof setTimeout> | undefined

function setSleepTimer(minutes: number | 'track' | null) {
  clearTimeout(sleepTimer)
  if (minutes === null) {
    sleepAt.value = null
    return
  }
  if (minutes === 'track') {
    sleepAt.value = 'track'
    return
  }
  sleepAt.value = Date.now() + minutes * 60_000
  sleepTimer = setTimeout(() => {
    sleepAt.value = null
    pause()
  }, minutes * 60_000)
}

// ---------- Подключение устройств ----------

function executeCommand(cmd: DeviceCommand) {
  switch (cmd.type) {
    case 'play-queue':
      radioSource.value = cmd.radio ?? null
      originalQueue = cmd.queue.slice()
      queue.value = cmd.queue.slice()
      index.value = Math.min(Math.max(0, cmd.index), cmd.queue.length - 1)
      startCurrent(cmd.positionMs)
      break
    case 'handoff': connect.handoff(cmd.to); break
    case 'enqueue':
      if (cmd.next) [...cmd.tracks].reverse().forEach(playNext)
      else addToQueue(cmd.tracks)
      break
    case 'pause': pause(); break
    case 'resume': resume(); break
    case 'next': next(); break
    case 'previous': previous(); break
    case 'seek': seek(cmd.ms); break
    case 'volume': setVolume(cmd.value); break
  }
}

/** Показать последнее воспроизведение на паузе — «Играть» продолжит с той же секунды. */
function restore(r: ResumeState) {
  if (current.value) return
  const q = r.queue?.queue.length ? r.queue : { queue: [r.track], index: 0, radio: null }
  const i = Math.max(0, q.queue.findIndex(t => t.uid === r.track.uid))
  queue.value = q.queue.slice()
  originalQueue = q.queue.slice()
  index.value = i
  radioSource.value = q.radio ?? null
  position.value = r.positionMs
  duration.value = r.track.durationMs
  pendingStartMs = r.positionMs
  isPlaying.value = false
  setMediaMetadata(r.track)
}

const connect = createConnect({
  state: () => (current.value
    ? { track: current.value, isPlaying: isPlaying.value, positionMs: Math.round(position.value), durationMs: Math.round(duration.value), at: Date.now(), volume: volume.value }
    : null),
  isPlaying: () => isPlaying.value,
  snapshot: () => (current.value
    ? { queue: queue.value.slice(index.value, index.value + 300), index: 0, positionMs: Math.round(position.value), radio: radioSource.value }
    : null),
  queueSnapshot: () => (current.value
    ? {
        key: `${queueRev}:${index.value}`,
        data: { queue: queue.value.slice(index.value, index.value + 200), index: 0, radio: radioSource.value },
      }
    : null),
  execute: executeCommand,
  pauseLocal: () => pause(),
  unlock: () => getYandex().unlock(),
})

/** Действия плеера: при управлении другим устройством уходят ему командой. */
const remoteActive = computed(() => connect.controlling.value !== null)

function uiPlayQueue(tracks: Track[], startIndex = 0, opts: { shuffle?: boolean, keepRadio?: boolean } = {}) {
  if (!remoteActive.value) return playQueue(tracks, startIndex, opts)
  let list = tracks
  let i = startIndex
  if (opts.shuffle) {
    list = shuffled(tracks)
    i = 0
  }
  connect.control({ type: 'play-queue', queue: list.slice(0, 300), index: i, positionMs: 0, play: true, radio: opts.keepRadio ? radioSource.value : null })
}

async function uiStartRadio(source: RadioSource) {
  if (!remoteActive.value) return startRadio(source)
  radioLoading.value = true
  try {
    const tracks = await $fetch<Track[]>('/api/radio', { method: 'POST', body: source })
    if (tracks.length) connect.control({ type: 'play-queue', queue: tracks, index: 0, positionMs: 0, play: true, radio: source })
  }
  catch (e: any) {
    error.value = e?.data?.message || 'Не удалось запустить радио'
  }
  finally {
    radioLoading.value = false
  }
}

const viaRemote = (cmd: DeviceCommand, localFn: () => void) => () => {
  if (!connect.control(cmd)) localFn()
}

let initialized = false
/** Вызывается один раз на клиенте (плагин app-слоя). */
function initPlayer() {
  if (initialized || import.meta.server) return
  initialized = true

  try {
    const saved = Number(localStorage.getItem('player:volume'))
    if (saved >= 0 && saved <= 1 && localStorage.getItem('player:volume') !== null) volume.value = saved
  }
  catch {}

  try {
    if (localStorage.getItem('player:autoplay') === '0') autoplay.value = false
    crossfade.value = Number(localStorage.getItem('player:crossfade')) || 0
    // По умолчанию включён на компьютере. AudioContext запустится при первом нажатии «Играть».
    if (visualizerSupported() && localStorage.getItem('player:visualizer') !== '0') {
      visualizer.value = true
      getYandex().setAnalyser(true)
    }
  }
  catch {}

  setMediaHandlers({ play: resume, pause, next: () => next(), previous, seek })
  connect.start()

  // Продолжить с того же места: последнее воспроизведение с любого устройства (если сейчас нигде не играет).
  $fetch<ResumeState | null>('/api/devices/resume', { query: { device: connect.selfId.value } })
    .then((r) => {
      if (r && !current.value && !connect.controlling.value) restore(r)
    })
    .catch(() => {})

  // Spotify присылает позицию редко — для него досчитываем её сами.
  ticker = setInterval(() => {
    if (engine.value === 'spotify' && isPlaying.value) position.value = spotifyLivePosition()
    if (isPlaying.value) setMediaPosition(position.value, duration.value)
    preloadNext()
  }, 500)
}

function connectSpotifyEngine() {
  return initSpotify(callbacks)
}

export function usePlayer() {
  const r = connect.remoteState
  const remote = remoteActive
  return {
    // При управлении другим устройством показываем его состояние.
    queue: computed(() => (remote.value ? [] : queue.value)),
    index: computed(() => (remote.value ? -1 : index.value)),
    current: computed<Track | null>(() => (remote.value ? r.value?.track ?? null : current.value)),
    isPlaying: computed(() => (remote.value ? Boolean(r.value?.isPlaying) : isPlaying.value)),
    buffering: computed(() => (remote.value ? false : buffering.value)),
    position: computed(() => (remote.value ? connect.remotePosition.value : position.value)),
    duration: computed(() => (remote.value ? r.value?.durationMs ?? 0 : duration.value)),
    volume: computed(() => (remote.value ? r.value?.volume ?? volume.value : volume.value)),
    muted: readonly(muted),
    repeat: readonly(repeat),
    shuffle: readonly(shuffle),
    autoplay: readonly(autoplay),
    crossfade: readonly(crossfade),
    visualizer: readonly(visualizer),
    visualizerSupported,
    /** Узел анализатора для отрисовки (null — визуализатор не работает для текущего трека) */
    analyserNode: () => (remoteActive.value || engine.value !== 'yandex' ? null : yandex?.analyserNode() ?? null),
    analyserStatus: readonly(analyserStatus),
    sleepAt: readonly(sleepAt),
    radioStation,
    radioSource: readonly(radioSource),
    radioLoading: readonly(radioLoading),
    error: computed(() => (remote.value ? '' : error.value)),
    engine: computed(() => (remote.value ? null : engine.value)),
    spotifyStatus: readonly(spotifyStatus),
    spotifyError: readonly(spotifyError),

    // Устройства
    devices: connect.devices,
    loadSpotifyDevices: connect.loadSpotifyDevices,
    selfDeviceId: connect.selfId,
    controlling: connect.controlling,
    remoteDevice: connect.remote,
    transferTo: connect.transferTo,

    playQueue: uiPlayQueue,
    playAt,
    playNext: (t: Track) => {
      if (!connect.control({ type: 'enqueue', tracks: [t], next: true })) playNext(t)
    },
    addToQueue: (list: Track[]) => {
      if (!connect.control({ type: 'enqueue', tracks: list, next: false })) addToQueue(list)
    },
    toggleShuffle,
    startWave: () => uiStartRadio({ station: 'wave' }),
    startRadio: uiStartRadio,
    setAutoplay,
    setCrossfade,
    setVisualizer,
    setMusicServices,
    setSleepTimer,
    toggle: () => {
      if (remote.value) connect.control({ type: r.value?.isPlaying ? 'pause' : 'resume' })
      else toggle()
    },
    resume: viaRemote({ type: 'resume' }, resume),
    pause: viaRemote({ type: 'pause' }, pause),
    next: viaRemote({ type: 'next' }, () => next()),
    previous: viaRemote({ type: 'previous' }, previous),
    seek: (ms: number) => {
      if (!connect.control({ type: 'seek', ms })) seek(ms)
    },
    setVolume: (v: number) => {
      if (!connect.control({ type: 'volume', value: v })) setVolume(v)
    },
    toggleMute,
    cycleRepeat,
    initPlayer,
    connectSpotifyEngine,
  }
}

// для HMR в dev
if (import.meta.hot) import.meta.hot.dispose(() => clearInterval(ticker))
