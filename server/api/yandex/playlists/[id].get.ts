/** Плейлист Яндекса (в т.ч. персональные: «Плейлист дня», «Дежавю»…). id: "UID:KIND". */
export default defineEventHandler(async (event): Promise<Collection> => {
  const [uid, kind] = decodeURIComponent(getRouterParam(event, 'id')!).split(':')
  if (!uid || !kind) throw createError({ statusCode: 400, message: 'Неверный id плейлиста' })
  return cached(`u:${await requireUserId(event)}:ypl:${uid}:${kind}`, 10 * 60_000, () => yandexPlaylist(event, uid, kind))
})
