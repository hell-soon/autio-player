/** Экспорт плейлиста сайта в Spotify или Яндекс Музыку. Тело: { to: "spotify" | "yandex" } */
export default defineEventHandler(async (event): Promise<ExportPlaylistResult> => {
  const userId = await requireUserId(event)
  const { to } = await readBody<{ to?: string }>(event) ?? {}
  if (to !== 'spotify' && to !== 'yandex') throw createError({ statusCode: 400, message: 'Укажите сервис: spotify или yandex' })
  return exportPlaylist(event, userId, getRouterParam(event, 'id')!, to)
})
