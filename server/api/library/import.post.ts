/** Принудительная сверка лайков с Яндексом и Spotify (кнопка в библиотеке). */
export default defineEventHandler(async (event): Promise<LikesSyncResult> => {
  const userId = await requireUserId(event)
  return syncLikes(event, userId, true)
})
