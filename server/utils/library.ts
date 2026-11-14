import { and, desc, eq, gte, inArray, max, sql } from 'drizzle-orm'
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
/** Трек от клиента: проверка формы (данные приходят от браузера) */
export function isValidTrack(t: unknown): t is Track {
  const x = t as Partial<Track> | null | undefined
  return !!x
    && typeof x.uid === 'string'
    && (x.source === 'spotify' || x.source === 'yandex')
    && typeof x.sourceId === 'string'
    && x.uid === `${x.source}:${x.sourceId}`
    && typeof x.title === 'string'
    && Array.isArray(x.artists)
    && typeof x.durationMs === 'number'
}

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

  // До 4 обложек для коллажа: берём по 12 первых треков с обложкой в каждом плейлисте (оконной функцией),
  // а не все треки всех плейлистов — в больших библиотеках это тысячи строк на каждое открытие.
  const covers: { playlistId: string, cover: string | null }[] = rows.length
    ? ((await db.execute(sql`
        select playlist_id as "playlistId", cover from (
          select pt.playlist_id, t.cover_url as cover,
                 row_number() over (partition by pt.playlist_id order by pt.position) as rn
          from ${playlistTracks} pt join ${tracks} t on t.uid = pt.track_uid
          where pt.playlist_id in (${sql.join(rows.map(r => sql`${r.id}`), sql`, `)}) and t.cover_url is not null
        ) x where rn <= 12
      `)) as unknown as { rows: { playlistId: string, cover: string | null }[] }).rows
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

/**
 * Добавляет трек в конец плейлиста (или на позицию position — «Отменить» удаление возвращает трек на место).
 * Повторно один и тот же трек не добавляется.
 */
export async function addToPlaylist(userId: string, id: string, t: Track, position?: number) {
  await ownPlaylist(userId, id)
  const db = useDb()
  const dup = await db.select({ id: playlistTracks.id }).from(playlistTracks)
    .where(and(eq(playlistTracks.playlistId, id), eq(playlistTracks.trackUid, t.uid))).limit(1)
  if (dup.length) return { added: false }

  await upsertTracks([t])
  if (typeof position === 'number' && position >= 0) {
    // Освобождаем место: всё, что ниже, сдвигается на одну позицию
    await db.update(playlistTracks).set({ position: sql`${playlistTracks.position} + 1` })
      .where(and(eq(playlistTracks.playlistId, id), gte(playlistTracks.position, position)))
    await db.insert(playlistTracks).values({ playlistId: id, trackUid: t.uid, position, addedAt: Date.now() })
  }
  else {
    const [last] = await db.select({ pos: max(playlistTracks.position) }).from(playlistTracks).where(eq(playlistTracks.playlistId, id))
    await db.insert(playlistTracks).values({ playlistId: id, trackUid: t.uid, position: (last?.pos ?? -1) + 1, addedAt: Date.now() })
  }
  await touch(id)
  return { added: true }
}

/** Удаляет треки из плейлиста. Возвращает их позиции — чтобы «Отменить» вернул каждый на своё место. */
export async function removeFromPlaylist(userId: string, id: string, uids: string | string[]) {
  await ownPlaylist(userId, id)
  const list = Array.isArray(uids) ? uids : [uids]
  if (!list.length) return []
  const db = useDb()
  // Место трека — его номер по порядку (а не сырое значение position: в старых плейлистах там бывают дыры)
  const all = await db.select({ uid: playlistTracks.trackUid }).from(playlistTracks)
    .where(eq(playlistTracks.playlistId, id)).orderBy(playlistTracks.position, playlistTracks.id)
  const wanted = new Set(list)
  const rows = all.flatMap((r, i) => (wanted.has(r.uid) ? [{ uid: r.uid, position: i }] : []))
  await db.delete(playlistTracks).where(and(eq(playlistTracks.playlistId, id), inArray(playlistTracks.trackUid, list)))
  // Позиции без дыр (0, 1, 2…): тогда «Отменить», вставляя по возрастанию позиций, вернёт каждый трек точно на своё место
  await db.execute(sql`
    update ${playlistTracks} set position = r.rn - 1
    from (select id, row_number() over (order by position, id) as rn from ${playlistTracks} where playlist_id = ${id}) r
    where ${playlistTracks.id} = r.id and ${playlistTracks.position} <> r.rn - 1`)
  await touch(id)
  return rows
}

/** Добавить несколько треков в конец плейлиста (выбор нескольких треков). Уже добавленные пропускаются. */
export async function addManyToPlaylist(userId: string, id: string, list: Track[]) {
  await ownPlaylist(userId, id)
  const db = useDb()
  const have = new Set((await db.select({ uid: playlistTracks.trackUid }).from(playlistTracks).where(eq(playlistTracks.playlistId, id))).map(r => r.uid))
  const seen = new Set<string>()
  const fresh = list.filter(t => !have.has(t.uid) && !seen.has(t.uid) && seen.add(t.uid))
  if (!fresh.length) return { added: 0 }
  await upsertTracks(fresh)
  const [last] = await db.select({ pos: max(playlistTracks.position) }).from(playlistTracks).where(eq(playlistTracks.playlistId, id))
  const start = (last?.pos ?? -1) + 1
  const now = Date.now()
  await db.insert(playlistTracks).values(fresh.map((t, i) => ({ playlistId: id, trackUid: t.uid, position: start + i, addedAt: now })))
  await touch(id)
  return { added: fresh.length }
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
