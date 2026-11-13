/**
 * Подсказки по мере ввода (Яндекс, /search/suggest?part=). Формат неофициальный — разбор мягкий:
 * не распознали ответ — подсказок нет (последние запросы на клиенте работают и без них).
 */
export default defineEventHandler(async (event): Promise<string[]> => {
  const userId = await requireUserId(event)
  const q = String(getQuery(event).q ?? '').trim().slice(0, 80)
  if (q.length < 2) return []
  const conn = await activeConnections(userId)
  if (!conn.yandex) return []
  return cached(`suggest:${q.toLowerCase()}`, 10 * 60_000, async () => {
    const res = await ymGet<{ result?: { suggestions?: unknown[] } }>(event, '/search/suggest', { part: q }).catch(() => null)
    const list = res?.result?.suggestions ?? []
    return list.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 8)
  })
})
