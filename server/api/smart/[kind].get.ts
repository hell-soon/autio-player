/** Умный плейлист по правилу: liked-month | top | forgotten | not-liked | new-week. */
export default defineEventHandler(async (event): Promise<Collection> => {
  const kind = getRouterParam(event, 'kind')
  if (!isSmartKind(kind)) throw createError({ statusCode: 404, message: 'Нет такого умного плейлиста' })
  return smartPlaylist(await requireUserId(event), kind)
})
