export default defineEventHandler(async (event) => {
  return addToPlaylist(await requireUserId(event), getRouterParam(event, 'id')!, await readTrackBody(event))
})
