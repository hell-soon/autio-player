/** Убрать несколько треков: { uids: string[] }. Ответ — их позиции (для «Отменить»). */
export default defineEventHandler(async (event) => {
  const { uids } = await readBody<{ uids?: unknown[] }>(event) ?? {}
  const list = Array.isArray(uids) ? uids.filter((u): u is string => typeof u === 'string').slice(0, 500) : []
  if (!list.length) throw createError({ statusCode: 400, message: 'Нет треков' })
  const removed = await removeFromPlaylist(await requireUserId(event), getRouterParam(event, 'id')!, list)
  return { ok: true, removed }
})
