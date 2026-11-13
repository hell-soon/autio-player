/** Отправить трек другу: { track, note? } — у него появится в «Вам прислали». */
export default defineEventHandler(async (event) => {
  const meId = await requireUserId(event)
  const track = await readTrackBody(event)
  const { note } = await readBody<{ note?: string }>(event) ?? {}
  await shareTrack(meId, getRouterParam(event, 'id')!, track, typeof note === 'string' ? note : undefined)
  return { ok: true }
})
