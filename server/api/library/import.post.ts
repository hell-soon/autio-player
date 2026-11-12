/** Импорт лайков из Spotify и Яндекса в библиотеку сайта. */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const res = await importLikes(event, userId)
  invalidateUserCache(userId)
  return res
})
