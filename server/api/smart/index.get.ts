/** Умные плейлисты для библиотеки (только непустые). */
export default defineEventHandler(async (event): Promise<SmartPlaylistInfo[]> => smartPlaylistCards(await requireUserId(event)))
