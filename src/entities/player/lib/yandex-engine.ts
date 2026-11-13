import { createAnalyser } from './analyser'
import type { EngineCallbacks } from './types'

/**
 * Движок на <audio>: треки Яндекса и треки Spotify, найденные в Яндексе.
 * Два элемента: пока играет один, следующий трек заранее грузится во второй —
 * переход без паузы, а при включённом кроссфейде треки плавно перетекают друг в друга.
 * load() нужно вызывать синхронно в обработчике тапа — иначе iOS Safari заблокирует звук.
 */
export function createYandexEngine(cb: EngineCallbacks) {
  const els = [new Audio(), new Audio()]
  for (const a of els) a.preload = 'auto'
  let active = 0
  let volume = 1
  let crossfadeMs = 0
  let preloadedSrc: string | null = null
  let fadeTimer: ReturnType<typeof setInterval> | undefined
  let nearEndFired = false
  let primed = false
  // Визуализатор: спектр звука (см. analyser.ts — там же, почему это безопасно для звука)
  const analyser = createAnalyser(s => cb.onAnalyser?.(s))

  const cur = () => els[active]!
  const other = () => els[1 - active]!

  // AbortError — нормальная ситуация, когда трек переключили до старта предыдущего.
  const ignoreAbort = (e: unknown) => {
    if ((e as DOMException)?.name === 'AbortError') return
    if ((e as DOMException)?.name === 'NotAllowedError') cb.onError('Браузер заблокировал автозапуск — нажмите «Играть»')
  }

  // События слушаем на обоих элементах, но реагируем только на активный.
  for (const a of els) {
    const isCur = () => a === cur()
    const time = () => {
      if (!isCur()) return
      const dur = Number.isFinite(a.duration) ? a.duration * 1000 : 0
      cb.onTime(a.currentTime * 1000, dur)
      // Кроссфейд: за N секунд до конца просим плеер перейти к следующему треку.
      if (crossfadeMs > 0 && dur > crossfadeMs * 2 && !nearEndFired && dur - a.currentTime * 1000 <= crossfadeMs) {
        nearEndFired = true
        cb.onEnded()
      }
    }
    a.addEventListener('timeupdate', time)
    a.addEventListener('durationchange', time)
    a.addEventListener('playing', () => {
      analyser.playing(a)
      if (!isCur()) return
      cb.onBuffering(false)
      cb.onPlaying(true)
    })
    a.addEventListener('pause', () => {
      if (isCur()) cb.onPlaying(false)
    })
    a.addEventListener('waiting', () => {
      if (isCur()) cb.onBuffering(true)
    })
    a.addEventListener('canplay', () => {
      if (isCur()) cb.onBuffering(false)
    })
    a.addEventListener('ended', () => {
      if (isCur() && !nearEndFired) cb.onEnded()
    })
    a.addEventListener('error', () => {
      const src = a.getAttribute('src')
      if (!src) return // сброс источника — не ошибка
      // Не удалась только предзагрузка — загрузим заново, когда дойдёт очередь (CORS по ней не судим)
      if (a === other() && src === preloadedSrc) {
        preloadedSrc = null
        return
      }
      if (!isCur()) return
      // Не загрузилось и без CORS — значит, недоступен сам трек (визуализатор тут ни при чём)
      if (analyser.suspect && a.crossOrigin !== 'anonymous') analyser.notCors()
      // Не загрузилось с CORS (нужен визуализатору) — пробуем тот же трек без CORS
      else if (analyser.fail(a)) {
        const pos = a.currentTime
        a.src = src
        if (pos > 0) a.addEventListener('loadedmetadata', () => { a.currentTime = pos }, { once: true })
        a.play().catch(ignoreAbort)
        return
      }
      cb.onBuffering(false)
      cb.onError('Не удалось загрузить трек: нет в Яндекс Музыке или нет доступа', true)
    })
  }

  /** iOS «разблокирует» звук для каждого элемента отдельно — прогреваем второй в том же жесте. */
  function primeOther() {
    if (primed) return
    primed = true
    const o = other()
    if (o.getAttribute('src')) return
    o.src = silentWav()
    o.play().then(() => o.pause()).catch(() => {})
  }

  function stopFade() {
    clearInterval(fadeTimer)
    fadeTimer = undefined
  }

  /** Плавно увести старый элемент в тишину и поднять новый. */
  function crossfade(from: HTMLAudioElement, to: HTMLAudioElement, ms: number) {
    stopFade()
    const start = performance.now()
    to.volume = 0
    fadeTimer = setInterval(() => {
      const k = Math.min(1, (performance.now() - start) / ms)
      to.volume = volume * k
      from.volume = volume * (1 - k)
      if (k >= 1) {
        stopFade()
        from.pause()
        from.removeAttribute('src')
        from.load()
        from.volume = volume
      }
    }, 50)
  }

  return {
    /**
     * iOS разрешает звук только из жеста пользователя. Если до запуска нужно что-то загрузить
     * (например, «Моя волна»), «разблокируем» элементы тихим звуком прямо в обработчике тапа.
     */
    unlock() {
      analyser.wake()
      const c = cur()
      if (!c.getAttribute('src')) {
        c.src = silentWav()
        c.play().then(() => c.pause()).catch(() => {})
      }
      primeOther()
    },

    /** startMs — продолжить с позиции (перенос с другого устройства). */
    load(src: string, startMs = 0) {
      analyser.wake()
      nearEndFired = false
      const prev = cur()
      const usePreloaded = preloadedSrc === src && other().getAttribute('src') === src && startMs === 0
      const fading = usePreloaded && crossfadeMs > 0 && !prev.paused

      if (usePreloaded) {
        // Следующий трек уже загружен во втором элементе — просто переключаемся.
        active = 1 - active
        preloadedSrc = null
        const next = cur()
        next.currentTime = 0
        if (fading) {
          crossfade(prev, next, crossfadeMs)
        }
        else {
          stopFade()
          prev.pause()
          next.volume = volume
        }
        next.play().catch(ignoreAbort)
        cb.onTime(0, Number.isFinite(next.duration) ? next.duration * 1000 : 0)
        primeOther()
        return
      }

      stopFade()
      const o = other()
      if (o.getAttribute('src') && o.getAttribute('src') !== preloadedSrc) o.pause()
      cb.onBuffering(true)
      prev.volume = volume
      analyser.prepare(prev)
      prev.src = src
      if (startMs > 0) {
        prev.addEventListener('loadedmetadata', () => {
          prev.currentTime = startMs / 1000
        }, { once: true })
      }
      prev.play().catch(ignoreAbort)
      primeOther()
    },

    /** Заранее загрузить следующий трек во второй элемент. */
    preload(src: string) {
      if (preloadedSrc === src) return
      const o = other()
      if (!o.paused && o.getAttribute('src') !== preloadedSrc) return // ещё доигрывает кроссфейд
      preloadedSrc = src
      o.volume = volume
      analyser.prepare(o)
      o.src = src
      o.load()
    },

    resume() {
      analyser.wake()
      cur().play().catch(ignoreAbort)
    },
    pause() {
      stopFade()
      cur().pause()
      // если шёл кроссфейд — старый трек тоже останавливаем
      const o = other()
      if (!o.paused) o.pause()
    },
    seek(ms: number) {
      nearEndFired = false
      cur().currentTime = ms / 1000
    },
    setVolume(v: number) {
      volume = v
      if (!fadeTimer) for (const a of els) a.volume = v
    },
    setCrossfade(ms: number) {
      crossfadeMs = Math.max(0, ms)
    },
    /** Включить/выключить анализатор. Вызывать из клика — браузер запускает звук Web Audio только из жеста. */
    setAnalyser(on: boolean) {
      analyser.setEnabled(on)
    },
    /** Узел анализатора, если визуализатор работает (иначе null) */
    analyserNode() {
      return analyser.node
    },
    stop() {
      stopFade()
      for (const a of els) {
        a.pause()
        a.removeAttribute('src')
        a.load()
      }
      preloadedSrc = null
    },
  }
}

export type YandexEngine = ReturnType<typeof createYandexEngine>

let silent: string | null = null
/** 0.1 с тишины в WAV (8 кГц, 8 бит, моно) как data: URI. */
function silentWav() {
  if (silent) return silent
  const samples = 800
  const buf = new Uint8Array(44 + samples)
  const view = new DataView(buf.buffer)
  const str = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF'); view.setUint32(4, 36 + samples, true); str(8, 'WAVE')
  str(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, 8000, true); view.setUint32(28, 8000, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true)
  str(36, 'data'); view.setUint32(40, samples, true)
  buf.fill(128, 44)
  silent = `data:audio/wav;base64,${btoa(String.fromCharCode(...buf))}`
  return silent
}
