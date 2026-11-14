import { and, asc, desc, eq, sql } from 'drizzle-orm'

/**
 * «Сведения о треке»: подробности из сервиса (год, жанр, альбом), качество потока,
 * где ещё есть этот трек и ваша статистика по нему. Всё мягко: нет данных — нет строки.
 */
export default defineEventHandler(async (event): Promise<TrackDetails> => {
  const userId = await requireUserId(event)
  const track = await readTrackBody(event)
  const conn = await activeConnections(userId)
  const { history, likes } = schema
  const db = useDb()

  const [plays, first, liked, yandexInfo, other] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(history).where(and(eq(history.userId, userId), eq(history.trackUid, track.uid))).then(r => r[0]?.n ?? 0),
    db.select({ at: history.playedAt }).from(history).where(and(eq(history.userId, userId), eq(history.trackUid, track.uid))).orderBy(asc(history.playedAt)).limit(1).then(r => r[0]?.at),
    db.select({ at: likes.likedAt }).from(likes).where(and(eq(likes.userId, userId), eq(likes.trackUid, track.uid))).orderBy(desc(likes.likedAt)).limit(1).then(r => r[0]?.at),
    // Подробности из Яндекса (год, жанр, лейбл) и качество потока
    track.source === 'yandex' && conn.yandex
      ? (async () => {
          const id = track.sourceId.split(':')[0]!
          const res = await ymGet<{ result?: any[] }>(event, `/tracks/${id}`).catch(() => null)
          const t = res?.result?.[0]
          const al = t?.albums?.[0]
          const stream = await cached(`u:${userId}:stream:${track.sourceId}:hq`, 90_000, () => yandexStreamUrl(event, track.sourceId, 'hq')).catch(() => null)
          return {
            year: typeof al?.year === 'number' ? al.year : undefined,
            genre: typeof al?.genre === 'string' ? al.genre : undefined,
            label: (al?.labels ?? []).map((l: any) => (typeof l === 'string' ? l : l?.name)).filter(Boolean)[0] as string | undefined,
            quality: stream ? `${stream.codec.toUpperCase()} · ${stream.bitrate} кбит/с` : undefined,
          }
        })()
      : Promise.resolve(undefined),
    // Где ещё есть: в другом подключённом сервисе
    (async () => {
      if (track.source === 'yandex' && conn.spotify) return (await findSpotifyMatch(event, track).catch(() => null)) ? 'spotify' as const : undefined
      if (track.source === 'spotify' && conn.yandex) return (await findYandexMatch(event, { title: track.title, artists: track.artists, durationMs: track.durationMs }).catch(() => null)) ? 'yandex' as const : undefined
      return undefined
    })(),
  ])

  return {
    ...yandexInfo,
    plays,
    firstPlayedAt: first,
    likedAt: liked,
    alsoIn: other,
  }
})
