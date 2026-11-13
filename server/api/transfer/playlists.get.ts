/** Свои плейлисты из Spotify и Яндекса — для диалога «Импорт плейлистов». */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  return listImportablePlaylists(event, userId)
})
