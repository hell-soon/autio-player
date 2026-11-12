import { and, desc, eq, inArray, max, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'

const { tracks, likes, playlists, playlistTracks, history } = schema

type TrackRow = typeof tracks.$inferSelect

export function rowToTrack(r: TrackRow): Track {
  return {
    uid: r.uid,
    source: r.source,
    sourceId: r.sourceId,
    title: r.title,
    artists: r.artists,
    artistIds: r.artistIds ?? undefined,
    album: r.album ?? undefined,
    albumId: r.albumId ?? undefined,
    coverUrl: r.coverUrl ?? undefined,
    durationMs: r.durationMs,
    explicit: r.explicit,
  }
}

/** Проверка трека из тела запроса (данные приходят от клиента). */
export async function readTrackBody(event: H3Event): Promise<Track> {
  const body = await readBody<{ track?: Partial<Track> }>(event)
  const t = body?.track
  const ok = t
    && typeof t.uid === 'string'
    && (t.source === 'spotify' || t.source === 'yandex')
    && typeof t.sourceId === 'string'
    && t.uid === `${t.source}:${t.sourceId}`
    && typeof t.title === 'string'
    && Array.isArray(t.artists)
    && typeof t.durationMs === 'number'
  if (!ok) throw createError({ statusCode: 400, message: 'Некорректный трек' })
  return t as Track
}

export async function upsertTracks(list: Track[]) {
  if (!list.length) return
  const now = Date.now()
  const values = list.map(t => ({
    uid: t.uid,
    source: t.source,
    sourceId: t.sourceId,
    title: t.title,
    artists: t.artists,
    artistIds: t.artistIds?.length ? t.artistIds : null,
    album: t.album ?? null,
    albumId: t.albumId ?? null,
    coverUrl: t.coverUrl ?? null,
    durationMs: t.durationMs,
    explicit: Boolean(t.explicit),
    updatedAt: now,
  }))
  await useDb().insert(tracks).values(values).onConflictDoUpdate({
    target: tracks.uid,
    set: {
      title: sql`excluded.title`,
      artists: sql`excluded.artists`,
      artistIds: sql`coalesce(excluded.artist_ids, ${tracks.artistIds})`,
      album: sql`excluded.album`,
      albumId: sql`excluded.album_id`,
      coverUrl: sql`excluded.cover_url`,
      durationMs: sql`excluded.duration_ms`,
      explicit: sql`excluded.explicit`,
      updatedAt: sql`excluded.updated_at`,
    },
  })
}

// ---------- Лайки ----------

export async function getLikedTracks(userId: string) {
  const rows = await useDb()
    .select({ t: tracks })
    .from(likes)
    .innerJoin(tracks, eq(likes.trackUid, tracks.uid))
    .where(eq(likes.userId, userId))
    .orderBy(desc(likes.likedAt))
  return rows.map(r => rowToTrack(r.t))
}

export async function getLikedIds(userId: string) {
  const rows = await useDb().select({ uid: likes.trackUid }).from(likes).where(eq(likes.userId, userId))
  return rows.map(r => r.uid)
}

export async function likeTrack(userId: string, t: Track) {
  await upsertTracks([t])
  await useDb().insert(likes).values({ userId, trackUid: t.uid, likedAt: Date.now() }).onConflictDoNothing()
}

/** Массовое добавление лайков (импорт). Возвращает число новых. */
export async function addLikes(userId: string, list: { track: Track, likedAt: number }[]) {
  if (!list.length) return 0
  const before = (await getLikedIds(userId)).length
  for (let i = 0; i < list.length; i += 200) {
    const chunk = list.slice(i, i + 200)
    await upsertTracks(chunk.map(x => x.track))
    await useDb().insert(likes).values(chunk.map(x => ({ userId, trackUid: x.track.uid, likedAt: x.likedAt }))).onConflictDoNothing()
  }
  return (await getLikedIds(userId)).length - before
}

export async function unlikeTrack(userId: string, uid: string) {
  await useDb().delete(likes).where(and(eq(likes.userId, userId), eq(likes.trackUid, uid)))
}

// ---------- Плейлисты ----------

export async function listPlaylists(userId: string) {
  const db = useDb()
  const rows = await db
    .select({
      id: playlists.id,
      name: playlists.name,
      updatedAt: playlists.updatedAt,
      count: sql<number>`count(${playlistTracks.id})::int`,
    })
    .from(playlists)
    .leftJoin(playlistTracks, eq(playlistTracks.playlistId, playlists.id))
    .where(eq(playlists.userId, userId))
    .groupBy(playlists.id)
    .orderBy(desc(playlists.updatedAt))

  // До 4 обложек для коллажа на карточке плейлиста.
  const covers = rows.length
    ? await db
        .select({ playlistId: playlistTracks.playlistId, cover: tracks.coverUrl })
        .from(playlistTracks)
        .innerJoin(tracks, eq(playlistTracks.trackUid, tracks.uid))
        .where(inArray(playlistTracks.playlistId, rows.map(r => r.id)))
        .orderBy(playlistTracks.position)
    : []
  return rows.map(r => ({
    ...r,
    covers: [...new Set(covers.filter(c => c.playlistId === r.id && c.cover).map(c => c.cover!))].slice(0, 4),
  }))
}

/** Плейлист текущего пользователя или 404 (чужие плейлисты недоступны). */
async function ownPlaylist(userId: string, id: string) {
  const p = await useDb().query.playlists.findFirst({ where: and(eq(playlists.id, id), eq(playlists.userId, userId)) })
  if (!p) throw createError({ statusCode: 404, message: 'Плейлист не найден' })
  return p
}

export async function createPlaylist(userId: string, name: string) {
  const id = crypto.randomUUID().slice(0, 12)
  const now = Date.now()
  await useDb().insert(playlists).values({ id, userId, name, createdAt: now, updatedAt: now })
  return { id, name }
}

export async function getPlaylist(userId: string, id: string): Promise<Collection> {
  const p = await ownPlaylist(userId, id)
  const rows = await useDb()
    .select({ t: tracks })
    .from(playlistTracks)
    .innerJoin(tracks, eq(playlistTracks.trackUid, tracks.uid))
    .where(eq(playlistTracks.playlistId, id))
    .orderBy(playlistTracks.position)
  const list = rows.map(r => rowToTrack(r.t))
  return {
    kind: 'playlist',
    id: p.id,
    title: p.name,
    subtitle: p.description ?? undefined,
    coverUrl: list.find(t => t.coverUrl)?.coverUrl,
    tracks: list,
  }
}

const touch = (id: string) => useDb().update(playlists).set({ updatedAt: Date.now() }).where(eq(playlists.id, id))

export async function renamePlaylist(userId: string, id: string, name: string, description?: string) {
  await ownPlaylist(userId, id)
  await useDb().update(playlists).set({ name, description: description ?? null, updatedAt: Date.now() }).where(eq(playlists.id, id))
}

export async function deletePlaylist(userId: string, id: string) {
  await ownPlaylist(userId, id)
  await useDb().delete(playlists).where(eq(playlists.id, id))
}

/** Добавляет трек в конец плейлиста. Повторно один и тот же трек не добавляется. */
export async function addToPlaylist(userId: string, id: string, t: Track) {
  await ownPlaylist(userId, id)
  const db = useDb()
  const dup = await db.select({ id: playlistTracks.id }).from(playlistTracks)
    .where(and(eq(playlistTracks.playlistId, id), eq(playlistTracks.trackUid, t.uid))).limit(1)
  if (dup.length) return { added: false }

  await upsertTracks([t])
  const [last] = await db.select({ pos: max(playlistTracks.position) }).from(playlistTracks).where(eq(playlistTracks.playlistId, id))
  await db.insert(playlistTracks).values({ playlistId: id, trackUid: t.uid, position: (last?.pos ?? -1) + 1, addedAt: Date.now() })
  await touch(id)
  return { added: true }
}

export async function removeFromPlaylist(userId: string, id: string, uid: string) {
  await ownPlaylist(userId, id)
  await useDb().delete(playlistTracks).where(and(eq(playlistTracks.playlistId, id), eq(playlistTracks.trackUid, uid)))
  await touch(id)
}

// ---------- История ----------

export async function addToHistory(userId: string, t: Track) {
  await upsertTracks([t])
  await useDb().insert(history).values({ userId, trackUid: t.uid, playedAt: Date.now() })
}

/** Недавно прослушанные, без повторов. */
export async function recentTracks(userId: string, limit = 20) {
  const rows = await useDb()
    .select({ t: tracks, last: max(history.playedAt) })
    .from(history)
    .innerJoin(tracks, eq(history.trackUid, tracks.uid))
    .where(eq(history.userId, userId))
    .groupBy(tracks.uid)
    .orderBy(desc(max(history.playedAt)))
    .limit(limit)
  return rows.map(r => rowToTrack(r.t))
}
