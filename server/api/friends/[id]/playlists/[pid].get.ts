/** Плейлист друга (только чтение). */
export default defineEventHandler(async (event): Promise<Collection> =>
  friendPlaylist(await requireUserId(event), getRouterParam(event, 'id')!, getRouterParam(event, 'pid')!))
