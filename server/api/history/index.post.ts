export default defineEventHandler(async (event) => {
  await addToHistory(await requireUserId(event), await readTrackBody(event))
  return { ok: true }
})
