/** Убрать трек из плейлиста. Ответ — его позиция (для «Отменить»). */
export default defineEventHandler(async (event) => {
  const removed = await removeFromPlaylist(await requireUserId(event), getRouterParam(event, 'id')!, decodeURIComponent(getRouterParam(event, 'uid')!))
  return { ok: true, removed }
})
