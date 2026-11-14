/** «Отменить» удаление: вернуть треки на их места. { items: [{ track, position }] } */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')!
  const { items } = await readBody<{ items?: { track?: unknown, position?: unknown }[] }>(event) ?? {}
  const list = (Array.isArray(items) ? items : [])
    .filter(i => isValidTrack(i?.track) && typeof i?.position === 'number')
    .map(i => ({ track: i.track as Track, position: i.position as number }))
    // По возрастанию позиций: каждый следующий встаёт уже с учётом вернувшихся до него
    .sort((a, b) => a.position - b.position)
  for (const i of list) await addToPlaylist(userId, id, i.track, i.position)
  return { ok: true, restored: list.length }
})
