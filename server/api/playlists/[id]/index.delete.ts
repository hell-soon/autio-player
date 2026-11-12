export default defineEventHandler(async (event) => {
  await deletePlaylist(await requireUserId(event), getRouterParam(event, 'id')!)
  return { ok: true }
})
