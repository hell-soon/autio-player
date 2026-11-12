/** Плейлист Spotify (id "saved" — любимые треки Spotify). */
export default defineEventHandler(async (event): Promise<Collection> => {
  const id = getRouterParam(event, 'id')!
  const userId = await requireUserId(event)
  if (id === 'saved') return cached(`u:${userId}:sp-saved`, 5 * 60_000, () => spotifySavedTracks(event))
  if (!/^[A-Za-z0-9]+$/.test(id)) throw createError({ statusCode: 400, message: 'Неверный id плейлиста' })
  return cached(`u:${userId}:sp:${id}`, 10 * 60_000, () => spotifyPlaylist(event, id))
})
