/** Последнее, что играло (для «продолжить с того же места»). ?device=<id этого устройства> */
export default defineEventHandler(async (event) => {
  const selfId = String(getQuery(event).device ?? '')
  return lastPlayback(await requireUserId(event), selfId)
})
