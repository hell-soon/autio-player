/** Отметить присланное как просмотренное (открыли блок «Вам прислали»). */
export default defineEventHandler(async (event) => {
  await markSharesSeen(await requireUserId(event))
  return { ok: true }
})
