/** Добавить несколько треков (выбор нескольких): { tracks: Track[] } */
export default defineEventHandler(async (event) => {
  const { tracks } = await readBody<{ tracks?: unknown[] }>(event) ?? {}
  const list = Array.isArray(tracks) ? tracks.filter(isValidTrack).slice(0, 500) : []
  if (!list.length) throw createError({ statusCode: 400, message: 'Нет треков' })
  return addManyToPlaylist(await requireUserId(event), getRouterParam(event, 'id')!, list)
})
