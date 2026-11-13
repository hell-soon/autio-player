/**
 * Анализатор спектра для визуализатора — только для движка на <audio> (Яндекс).
 * Spotify Web Playback SDK отдаёт звук через DRM: к его данным доступа нет.
 *
 * Как это устроено и где опасно:
 *  - чтобы прочитать звук с CDN Яндекса, <audio> должен грузить его с crossOrigin="anonymous",
 *    а CDN — отвечать CORS-заголовками. Если заголовков нет, такой элемент вообще не загрузится:
 *    тогда визуализатор выключается до перезагрузки страницы, а трек перезапускается без CORS (fail()).
 *  - элемент, подключённый к AudioContext, навсегда звучит только через него. Поэтому подключаем его,
 *    лишь когда он уже реально играет с CORS и контекст запущен — иначе можно получить тишину.
 *  - только компьютер: на iOS звук через Web Audio обрывается в фоне и на заблокированном экране.
 */

export type AnalyserStatus = 'off' | 'waiting' | 'on' | 'unavailable'

export function createAnalyser(onStatus: (s: AnalyserStatus) => void) {
  let enabled = false
  /** Что выбрал пользователь (enabled может временно выключаться на время проверки CORS) */
  let wanted = false
  /** Трек с CORS не загрузился и перезапущен без CORS: если так заиграет — виноват CORS, иначе сам трек */
  let suspect = false
  /** CDN хотя бы раз отдал звук с CORS — дальше crossOrigin не снимаем (подключённые элементы без него замолчат) */
  let corsOk = false
  let failed = false
  let ctx: AudioContext | null = null
  let node: AnalyserNode | null = null
  const connected = new WeakSet<HTMLMediaElement>()
  /** Хоть один элемент звучит через контекст — его нельзя оставлять приостановленным, иначе тишина */
  let anyConnected = false

  const status = (): AnalyserStatus => (failed ? 'unavailable' : !enabled ? 'off' : node ? 'on' : 'waiting')

  function ensureContext() {
    if (ctx || typeof AudioContext === 'undefined') return ctx
    ctx = new AudioContext()
    node = null
    // Safari приостанавливает контекст при прерываниях (звонок, сон) — сразу пробуем запустить снова
    ctx.addEventListener('statechange', () => {
      if (anyConnected && ctx?.state !== 'running' && ctx?.state !== 'closed') ctx?.resume().catch(() => {})
    })
    return ctx
  }

  function connect(a: HTMLMediaElement) {
    if (connected.has(a) || !ctx || ctx.state !== 'running') return
    try {
      if (!node) {
        node = ctx.createAnalyser()
        node.fftSize = 2048
        node.smoothingTimeConstant = 0.8
        node.connect(ctx.destination)
      }
      ctx.createMediaElementSource(a).connect(node)
      connected.add(a)
      anyConnected = true
      onStatus(status())
    }
    catch (e) {
      console.warn('[analyser] не удалось подключить', e)
    }
  }

  return {
    /** Вызывать в обработчике клика: браузер разрешает запуск AudioContext только из жеста. */
    setEnabled(on: boolean) {
      wanted = on
      enabled = on && !failed && !suspect
      if (enabled) ensureContext()?.resume().catch(() => {})
      onStatus(status())
    },

    /** Из жестов пользователя (play/next): «будит» контекст, если браузер его приостановил. */
    wake() {
      if (ctx && ctx.state !== 'running' && (enabled || anyConnected)) ctx.resume().catch(() => {})
    },

    /** Перед присвоением src: элементам нужен crossOrigin, пока визуализатор включён (и навсегда — после подключения). */
    prepare(a: HTMLMediaElement) {
      const want = connected.has(a) || (enabled && !failed)
      if (want) a.crossOrigin = 'anonymous'
      else a.removeAttribute('crossorigin')
    },

    /** Элемент начал играть: CORS работает — подключаем к анализатору. */
    playing(a: HTMLMediaElement) {
      if (connected.has(a) && ctx && ctx.state !== 'running') ctx.resume().catch(() => {})
      // Без CORS заиграло, а с CORS — нет: значит, CDN не разрешает читать звук. Визуализатор — выкл.
      if (suspect && a.crossOrigin !== 'anonymous' && a.currentSrc.startsWith('http')) {
        suspect = false
        failed = true
        onStatus(status())
        return
      }
      if (a.crossOrigin !== 'anonymous' || !a.currentSrc.startsWith('http')) return
      corsOk = true
      if (!enabled) return
      if (ctx?.state === 'running') connect(a)
      else ctx?.resume().then(() => connect(a)).catch(() => {})
    },

    /**
     * Ошибка загрузки элемента с CORS, а CDN ещё ни разу не отдал звук с CORS.
     * Возвращает true — трек надо перезапустить без crossOrigin; итог решится в playing / notCors.
     */
    fail(a: HTMLMediaElement) {
      if (a.crossOrigin !== 'anonymous' || corsOk || connected.has(a)) return false
      // Пока не знаем, CORS это или сам трек недоступен: пробуем без CORS (см. playing / notCors)
      suspect = true
      enabled = false
      a.removeAttribute('crossorigin')
      return true
    },

    /** Не загрузилось и без CORS — дело в треке, а не в CDN: визуализатор возвращаем. */
    notCors() {
      if (!suspect) return
      suspect = false
      enabled = wanted && !failed
      onStatus(status())
    },

    get suspect() {
      return suspect
    },

    get node() {
      return enabled ? node : null
    },
  }
}

export type Analyser = ReturnType<typeof createAnalyser>
