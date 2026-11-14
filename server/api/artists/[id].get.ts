import { and, eq, sql } from 'drizzle-orm'

/**
 * Страница исполнителя. "yandex:ID" — напрямую; "spotify:ID" и "name:Имя" — находим исполнителя в Яндексе
 * (у Spotify в Development Mode закрыты топ-треки исполнителя).
 */
export default defineEventHandler(async (event): Promise<ArtistPage> => {
  const raw = decodeURIComponent(getRouterParam(event, 'id')!)
  const sep = raw.indexOf(':')
  const source = raw.slice(0, sep)
  const id = raw.slice(sep + 1)
  if (sep < 0 || !id) throw createError({ statusCode: 400, message: 'Неверный id исполнителя' })

  let yandexId: string | null = source === 'yandex' ? id : null
  // "name:Имя" — для треков, у которых нет id исполнителя (сохранены до появления ссылок).
  if (source === 'name') {
    yandexId = await yandexFindArtistId(event, id)
    if (!yandexId) throw createError({ statusCode: 404, message: `«${id}» не найден в Яндекс Музыке` })
  }
  if (source === 'spotify') {
    const name = await spotifyArtistName(event, id)
    yandexId = await yandexFindArtistId(event, name)
    if (!yandexId) throw createError({ statusCode: 404, message: `«${name}» не найден в Яндекс Музыке` })
  }
  if (!yandexId || !/^\d+$/.test(yandexId)) throw createError({ statusCode: 400, message: 'Неизвестный исполнитель' })
  const yid = yandexId
  const userId = await requireUserId(event)
  const page = await cached(`u:${userId}:artist:${yid}`, 30 * 60_000, () => yandexArtist(event, yid))
  // «Вы слушали N раз» — по истории сайта (исполнитель в списке исполнителей трека)
  const { history, tracks } = schema
  const [row] = await useDb().select({ n: sql<number>`count(*)::int` }).from(history)
    .innerJoin(tracks, eq(history.trackUid, tracks.uid))
    .where(and(eq(history.userId, userId), sql`${tracks.artists} @> ${JSON.stringify([page.artist.name])}::jsonb`))
  return { ...page, yourPlays: row?.n ?? 0 }
})
