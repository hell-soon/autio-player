export default defineEventHandler(async (event) => {
  await removeFromPlaylist(await requireUserId(event), getRouterParam(event, 'id')!, decodeURIComponent(getRouterParam(event, 'uid')!))
  return { ok: true }
})
