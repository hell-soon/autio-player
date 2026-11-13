/** «Вышло новое» у любимых исполнителей (кэш 6 часов). */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  return cached(`u:${userId}:releases`, 6 * 3600_000, () => newReleases(event, userId))
})
