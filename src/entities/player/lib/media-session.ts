/** Media Session API: обложка и кнопки на экране блокировки, в шторке Android и на клавиатуре. */

const supported = () => import.meta.client && 'mediaSession' in navigator

export function setMediaMetadata(track: Track | null) {
  if (!supported()) return
  navigator.mediaSession.metadata = track
    ? new MediaMetadata({
        title: track.title,
        artist: track.artists.join(', '),
        album: track.album ?? '',
        artwork: track.coverUrl ? [{ src: track.coverUrl, sizes: '400x400', type: 'image/jpeg' }] : [],
      })
    : null
}

export function setMediaPlaybackState(playing: boolean) {
  if (!supported()) return
  navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
}

export function setMediaPosition(positionMs: number, durationMs: number) {
  if (!supported() || !durationMs) return
  try {
    navigator.mediaSession.setPositionState({
      duration: durationMs / 1000,
      position: Math.min(positionMs, durationMs) / 1000,
      playbackRate: 1,
    })
  }
  catch {
    // некоторые браузеры бросают на граничных значениях — не критично
  }
}

export function setMediaHandlers(h: {
  play: () => void
  pause: () => void
  next: () => void
  previous: () => void
  seek: (ms: number) => void
}) {
  if (!supported()) return
  const set = (action: MediaSessionAction, fn: MediaSessionActionHandler) => {
    try {
      navigator.mediaSession.setActionHandler(action, fn)
    }
    catch {
      // действие не поддерживается браузером
    }
  }
  set('play', h.play)
  set('pause', h.pause)
  set('nexttrack', h.next)
  set('previoustrack', h.previous)
  set('seekto', d => d.seekTime !== undefined && h.seek(d.seekTime * 1000))
}
