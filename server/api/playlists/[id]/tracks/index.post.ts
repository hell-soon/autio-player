/** Добавить трек в плейлист: { track, position? } — position возвращает трек на прежнее место («Отменить»). */
export default defineEventHandler(async (event) => {
  const track = await readTrackBody(event)
  const { position } = await readBody<{ position?: unknown }>(event) ?? {}
  return addToPlaylist(await requireUserId(event), getRouterParam(event, 'id')!, track, typeof position === 'number' ? position : undefined)
})
