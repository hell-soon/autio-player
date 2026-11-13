/** Фоновая сверка лайков (при открытии сайта и возврате на вкладку): не чаще раза в 5 минут на сервис. */
export default defineEventHandler(async (event): Promise<LikesSyncResult> => {
  const userId = await requireUserId(event)
  return syncLikes(event, userId)
})
