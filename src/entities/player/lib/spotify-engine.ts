import { isMobileBrowser } from '@/shared/lib'
import type { EngineCallbacks } from './types'

/**
 * Spotify Web Playback SDK: сайт становится Spotify Connect-устройством и играет звук сам.
 * Работает только в десктопных браузерах и только при доступности серверов Spotify.
 * Если SDK недоступен (телефон, блокировка сети, нет Premium) — status != 'ready',
 * и плеер играет треки Spotify через совпадение в Яндекс Музыке.
 */

export type SpotifyStatus = 'idle' | 'loading' | 'ready' | 'unsupported' | 'unavailable' | 'error'

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js'
const READY_TIMEOUT_MS = 10_000

export const spotifyStatus = ref<SpotifyStatus>('idle')
export const spotifyError = ref('')

let player: Spotify.Player | null = null
let deviceId: string | null = null
let tokenCache: { accessToken: string, expiresAt: number } | null = null
let cb: EngineCallbacks | null = null

// Отслеживание окончания трека (у SDK нет события "ended").
let expectedId: string | null = null
let started = false
let lastState: { s: Spotify.PlaybackState, at: number } | null = null

function loadSdk() {
  return new Promise<void>((resolve, reject) => {
    if (window.Spotify) return resolve()
    window.onSpotifyWebPlaybackSDKReady = () => resolve()
    const s = document.createElement('script')
    s.src = SDK_URL
    s.async = true
    s.onerror = () => reject(new Error('Не удалось загрузить Spotify SDK'))
    document.head.appendChild(s)
  })
}

async function getToken() {
  if (tokenCache && tokenCache.expiresAt - Date.now() > 60_000) return tokenCache.accessToken
  const fresh = await $fetch('/api/spotify/token')
  tokenCache = fresh
  return fresh.accessToken
}

const isTrack = (t: Spotify.SdkTrack | null | undefined, id: string) => !!t && (t.id === id || t.linked_from?.id === id)

function handleState(s: Spotify.PlaybackState | null) {
  if (!s || !cb || !expectedId) return
  lastState = { s, at: Date.now() }
  const current = s.track_window.current_track
  const isExpected = isTrack(current, expectedId)

  if (isExpected) {
    started = true
    cb.onBuffering(Boolean(s.loading))
    cb.onPlaying(!s.paused)
    cb.onTime(s.position, s.duration)
    // Трек доиграл: пауза на нуле, а он уже в "предыдущих".
    if (s.paused && s.position === 0 && s.track_window.previous_tracks.some(t => isTrack(t, expectedId!))) {
      finish()
    }
    return
  }

  // Spotify сам включил что-то другое (автовоспроизведение после конца трека) — значит, наш доиграл.
  if (started && current && !s.paused) finish()
}

function finish() {
  expectedId = null
  started = false
  player?.pause()
  cb?.onEnded()
}

/** Позиция с поправкой на прошедшее время: SDK не шлёт события каждую секунду. */
export function spotifyLivePosition() {
  if (!lastState) return 0
  const { s, at } = lastState
  return s.paused ? s.position : Math.min(s.duration, s.position + (Date.now() - at))
}

export async function initSpotify(callbacks: EngineCallbacks) {
  cb = callbacks
  if (spotifyStatus.value === 'loading' || spotifyStatus.value === 'ready') return

  if (isMobileBrowser()) {
    spotifyStatus.value = 'unsupported'
    spotifyError.value = 'В мобильных браузерах Spotify не играет — треки звучат через Яндекс Музыку'
    return
  }

  spotifyStatus.value = 'loading'
  spotifyError.value = ''

  const timeout = setTimeout(() => {
    if (spotifyStatus.value !== 'loading') return
    spotifyStatus.value = 'unavailable'
    spotifyError.value = 'Нет соединения с серверами Spotify (VPN, блокировщик рекламы или DRM в браузере). Треки играют через Яндекс Музыку'
  }, READY_TIMEOUT_MS)

  try {
    await loadSdk()
    player = new window.Spotify!.Player({
      name: 'Audio Web',
      volume: 0.8,
      getOAuthToken: fn => void getToken().then(fn),
    })

    player.addListener('ready', ({ device_id }) => {
      clearTimeout(timeout)
      deviceId = device_id
      spotifyStatus.value = 'ready'
      spotifyError.value = ''
    })
    player.addListener('not_ready', () => {
      deviceId = null
    })
    player.addListener('player_state_changed', handleState)
    player.addListener('initialization_error', (e) => {
      spotifyStatus.value = 'unsupported'
      spotifyError.value = `Браузер не поддерживает Spotify: ${e.message}`
    })
    player.addListener('authentication_error', (e) => {
      spotifyStatus.value = 'error'
      spotifyError.value = `Ошибка авторизации Spotify: ${e.message}`
    })
    player.addListener('account_error', () => {
      spotifyStatus.value = 'error'
      spotifyError.value = 'Для воспроизведения нужен Spotify Premium'
    })
    player.addListener('playback_error', (e) => {
      cb?.onError(`Spotify: ${e.message}`)
    })

    if (!(await player.connect())) {
      spotifyStatus.value = 'unsupported'
      spotifyError.value = 'Браузер не поддерживает воспроизведение Spotify'
    }
  }
  catch (e: any) {
    clearTimeout(timeout)
    spotifyStatus.value = 'error'
    spotifyError.value = e?.message ?? String(e)
  }
}

/** Вызывать из обработчика клика: activateElement() должен стартовать внутри жеста пользователя. */
export function spotifyPlay(trackId: string, positionMs = 0) {
  if (!player || !deviceId) return Promise.reject(new Error('Плеер Spotify не готов'))
  expectedId = trackId
  started = false
  lastState = null
  cb?.onBuffering(true)
  return player.activateElement().then(() => $fetch('/api/spotify/play', {
    method: 'PUT',
    body: { deviceId, trackIds: [trackId], positionMs },
  }))
}

export const spotifyEngine = {
  resume: () => player?.resume(),
  pause: () => player?.pause(),
  seek: (ms: number) => player?.seek(ms),
  setVolume: (v: number) => player?.setVolume(v),
  stop() {
    expectedId = null
    started = false
    lastState = null
    return player?.pause()
  },
}

export function disconnectSpotify() {
  player?.disconnect()
  player = null
  deviceId = null
  tokenCache = null
  spotifyStatus.value = 'idle'
}
