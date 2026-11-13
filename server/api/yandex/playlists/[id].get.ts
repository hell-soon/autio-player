/** Плейлист Яндекса (в т.ч. персональные: «Плейлист дня», «Дежавю»…). id: "UID:KIND". */
export default defineEventHandler(async (event): Promise<Collection> => {
  // «Мне нравится» текущего пользователя
  if (decodeURIComponent(getRouterParam(event, 'id')!) === 'liked') {
    const userId = await requireUserId(event)
    const acc = await getAccount(userId, 'yandex')
    if (!acc) throw createError({ statusCode: 409, message: 'Яндекс Музыка не подключена' })
    return cached(`u:${userId}:yliked`, 5 * 60_000, () => yandexLikedCollection(event, acc.providerUserId))
  }
  const [uid, kind] = decodeURIComponent(getRouterParam(event, 'id')!).split(':')
  if (!uid || !kind) throw createError({ statusCode: 400, message: 'Неверный id плейлиста' })
  return cached(`u:${await requireUserId(event)}:ypl:${uid}:${kind}`, 10 * 60_000, () => yandexPlaylist(event, uid, kind))
})
