export default defineEventHandler(async (event) => {
  const limit = Math.min(50, Number(getQuery(event).limit) || 20)
  return recentTracks(await requireUserId(event), limit)
})
