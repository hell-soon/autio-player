/** Поиск песни по строчке из текста. ?q=фраза */
export default defineEventHandler(async (event): Promise<LyricsSearchHit[]> => {
  const userId = await requireUserId(event)
  const q = String(getQuery(event).q ?? '').trim().slice(0, 200)
  if (!q) return []
  return cached(`u:${userId}:lyrics-search:${q.toLowerCase()}`, 60 * 60_000, () => searchByLyrics(event, userId, q))
})
