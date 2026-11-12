/**
 * Простой кэш в памяти инстанса сервера (на Vercel — пока инстанс «тёплый»).
 * Нужен, чтобы не ходить в Spotify/Яндекс за одним и тем же при каждом открытии вкладки.
 */
const store = new Map<string, { at: number, ttl: number, value: Promise<unknown> }>()
const MAX = 2000

export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>, opts: { fresh?: boolean } = {}): Promise<T> {
  const hit = store.get(key)
  if (!opts.fresh && hit && Date.now() - hit.at < hit.ttl) return hit.value as Promise<T>

  const value = fn()
  store.set(key, { at: Date.now(), ttl: ttlMs, value })
  // Ошибки не кэшируем.
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key)
  })
  if (store.size > MAX) store.delete(store.keys().next().value!)
  return value
}

/** Сбросить всё закэшированное для пользователя (ключи начинаются с "u:<id>:"). */
export function invalidateUserCache(userId: string) {
  const prefix = `u:${userId}:`
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k)
}
