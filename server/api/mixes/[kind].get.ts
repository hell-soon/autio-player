/** «Микс дня» (daily) или «Открытия недели» (discover). ?fresh — пересобрать. */
export default defineEventHandler(async (event): Promise<Collection> => {
  const userId = await requireUserId(event)
  const kind = getRouterParam(event, 'kind')
  if (kind !== 'daily' && kind !== 'discover') throw createError({ statusCode: 404, message: 'Нет такой подборки' })
  return getMix(event, userId, kind, getQuery(event).fresh !== undefined)
})
