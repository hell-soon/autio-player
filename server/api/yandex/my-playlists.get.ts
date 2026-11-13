/** Свои плейлисты в Яндекс Музыке — для раздела «Из Яндекса» в библиотеке. */
export default defineEventHandler(async (event): Promise<ExternalPlaylist[]> => {
  const userId = await requireUserId(event)
  const acc = await getAccount(userId, 'yandex')
  if (!acc) throw createError({ statusCode: 409, message: 'Яндекс Музыка не подключена' })
  return cached(`u:${userId}:yplaylists`, 10 * 60_000, () => yandexUserPlaylists(event, acc.providerUserId))
})
