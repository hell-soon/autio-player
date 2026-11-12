export default defineEventHandler(async (event) => {
  const { q, offset } = getQuery(event)
  const text = String(q ?? '').trim()
  if (!text) return { total: 0, tracks: [] }
  return spotifySearch(event, text, Number(offset) || 0)
})
