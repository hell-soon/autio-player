/** Статистика прослушиваний: ?range=month|year|all&tz=<смещение в минутах, как Date#getTimezoneOffset> */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const range = (['month', 'year', 'all'].includes(String(q.range)) ? q.range : 'year') as StatsRange
  const tz = Math.max(-840, Math.min(840, Number(q.tz) || 0))
  return listeningStats(await requireUserId(event), range, tz)
})
