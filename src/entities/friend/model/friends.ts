import { useCachedFetch } from '@/shared/lib'

/** Список друзей и что у них играет (кэш 20 с — «сейчас играет» меняется часто). */
export function useFriends() {
  return useCachedFetch<FriendInfo[]>('/api/friends', { key: 'friends:list', ttl: 20_000, default: () => [] })
}

/** Позиция трека у друга сейчас: снимок + сколько прошло с него (по часам сервера, без расхождения часов). */
export function friendPositionNow(np: FriendNowPlaying, receivedAt: number) {
  if (!np.isPlaying) return np.positionMs
  return Math.min(np.track.durationMs || Infinity, np.positionMs + (np.serverNow - np.at) + (Date.now() - receivedAt))
}

/** «Слушает сейчас» / «В сети 2 ч назад» */
export function lastSeenLabel(f: FriendInfo) {
  if (f.nowPlaying?.isPlaying) return 'Слушает сейчас'
  // Без «был/была»: пол друга неизвестен
  if (!f.lastSeen) return 'Ещё не в сети'
  const min = Math.floor((Date.now() - f.lastSeen) / 60_000)
  if (min < 2) return 'В сети'
  if (min < 60) return `В сети ${min} мин назад`
  const h = Math.floor(min / 60)
  if (h < 24) return `В сети ${h} ч назад`
  const d = Math.floor(h / 24)
  return d === 1 ? 'В сети вчера' : `В сети ${d} дн. назад`
}
