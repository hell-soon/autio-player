import { and, desc, eq, ilike, lt, or, sql } from 'drizzle-orm'

/**
 * История прослушиваний целиком (каждое прослушивание со временем), с поиском и подгрузкой.
 * ?q= — по названию и исполнителю, ?before= — курсор (unix ms), ?limit= — до 100.
 */
export default defineEventHandler(async (event): Promise<HistoryEntry[]> => {
  const userId = await requireUserId(event)
  const query = getQuery(event)
  const q = String(query.q ?? '').trim().slice(0, 100)
  const before = Number(query.before) || 0
  const limit = Math.min(100, Number(query.limit) || 50)
  const { history, tracks } = schema

  const conds = [eq(history.userId, userId)]
  if (before) conds.push(lt(history.playedAt, before))
  if (q) {
    // Экранируем % и _ — иначе «100%» искал бы что угодно
    const like = `%${q.replace(/[\\%_]/g, m => `\\${m}`)}%`
    conds.push(or(ilike(tracks.title, like), sql`${tracks.artists}::text ilike ${like}`)!)
  }
  const rows = await useDb()
    .select({ t: tracks, playedAt: history.playedAt })
    .from(history)
    .innerJoin(tracks, eq(history.trackUid, tracks.uid))
    .where(and(...conds))
    .orderBy(desc(history.playedAt))
    .limit(limit)
  return rows.map(r => ({ track: rowToTrack(r.t), playedAt: r.playedAt }))
})
