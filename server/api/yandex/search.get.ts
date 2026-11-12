export default defineEventHandler(async (event) => {
  const { q, page } = getQuery(event)
  const text = String(q ?? '').trim()
  if (!text) return { total: 0, tracks: [] }
  return yandexSearch(event, text, Number(page) || 0)
})
