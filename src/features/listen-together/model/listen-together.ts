import { usePlayer } from '@/entities/player'
import { friendPositionNow } from '@/entities/friend'

/**
 * «Слушать вместе»: плеер следует за другом — тот же трек с той же позиции.
 * Опрос /api/friends/:id/now раз в 4 с (WebSocket на Vercel нет). Правила:
 *  - сменил трек → включаем его; разошлись > 6 с → подравниваем позицию;
 *  - друг на паузе → пауза; снова играет → играем;
 *  - человек сам включил другое → режим выключается (не мешаем ему).
 * Старт — синхронно в клике (iOS разрешает звук только из жеста), по данным из списка друзей.
 */
const POLL_MS = 4000
const DRIFT_MS = 6000

const friend = ref<{ id: string, name: string } | null>(null)
const status = ref<'following' | 'waiting'>('following')
let timer: ReturnType<typeof setInterval> | undefined
/** uid трека, который включили мы сами (чтобы отличить ручное переключение) */
let followedUid: string | null = null
/** Трек друга доиграл у нас до конца и плеер сам перешёл дальше — это не ручное переключение */
let endedNaturally = false
let watching = false

export function useListenTogether() {
  const p = usePlayer()

  // Один наблюдатель на всё приложение: запоминаем, что трек сменился сам (доиграл), а не руками
  if (!watching && import.meta.client) {
    watching = true
    let lastPos = 0
    let lastDur = 0
    watch(() => p.position.value, (v) => {
      lastPos = v
      lastDur = p.duration.value
    })
    watch(() => p.current.value?.uid, () => {
      if (friend.value && lastDur && lastDur - lastPos < 8000) endedNaturally = true
    })
  }

  function stop() {
    clearInterval(timer)
    timer = undefined
    friend.value = null
    followedUid = null
  }

  function follow(np: FriendNowPlaying, receivedAt: number) {
    followedUid = np.track.uid
    p.playFrom([np.track], 0, friendPositionNow(np, receivedAt))
    if (!np.isPlaying) p.pause()
  }

  async function tick() {
    const f = friend.value
    if (!f) return
    // Человек сам включил другой трек — перестаём следовать (если трек просто доиграл — догоняем друга дальше)
    if (followedUid && p.current.value && p.current.value.uid !== followedUid && !endedNaturally) return stop()
    endedNaturally = false
    const np = await $fetch<FriendNowPlaying | null>(`/api/friends/${f.id}/now`).catch(() => undefined)
    if (np === undefined || friend.value?.id !== f.id) return
    if (!np) {
      status.value = 'waiting'
      return
    }
    status.value = 'following'
    const received = Date.now()
    if (np.track.uid !== p.current.value?.uid) return follow(np, received)
    const target = friendPositionNow(np, received)
    if (np.isPlaying && !p.isPlaying.value) p.resume()
    if (!np.isPlaying && p.isPlaying.value) p.pause()
    if (Math.abs(target - p.position.value) > DRIFT_MS) p.seek(target)
  }

  /** Вызывать из клика. np — что играет у друга по списку друзей (без ожидания запроса). */
  function start(f: { id: string, name: string }, np: FriendNowPlaying) {
    stop()
    friend.value = f
    status.value = 'following'
    follow(np, np.serverNow)
    timer = setInterval(tick, POLL_MS)
  }

  return { friend: readonly(friend), status: readonly(status), start, stop }
}
