/** Альбом источника: id вида "spotify:ID" или "yandex:ID". */
export default defineEventHandler(async (event): Promise<Collection> => {
  const raw = decodeURIComponent(getRouterParam(event, 'id')!)
  const [source, id] = raw.split(':')
  if (!id) throw createError({ statusCode: 400, message: 'Неверный id альбома' })
  const userId = await requireUserId(event)
  // Альбомы не меняются — кэшируем надолго.
  if (source === 'spotify') return cached(`u:${userId}:alb:${raw}`, 60 * 60_000, () => spotifyAlbum(event, id))
  if (source === 'yandex' && /^\d+$/.test(id)) return cached(`u:${userId}:alb:${raw}`, 60 * 60_000, () => yandexAlbum(event, id))
  throw createError({ statusCode: 400, message: 'Неизвестный источник' })
})
