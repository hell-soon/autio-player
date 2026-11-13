/** Импорт выбранных плейлистов Spotify/Яндекса в библиотеку сайта. Тело: { ids: ["spotify:ID", "yandex:UID:KIND", "mix:daily"…] } */
export default defineEventHandler(async (event): Promise<ImportPlaylistsResult> => {
  const userId = await requireUserId(event)
  const body = await readBody<{ ids?: unknown }>(event)
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x): x is string => typeof x === 'string' && /^(spotify|yandex|mix|smart|taste|friend|friend-liked):/.test(x)) : []
  if (!ids.length) throw createError({ statusCode: 400, message: 'Не выбраны плейлисты' })
  return importPlaylists(event, userId, ids)
})
