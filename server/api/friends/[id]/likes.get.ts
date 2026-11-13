/** Любимые треки друга (только чтение). */
export default defineEventHandler(async (event): Promise<Collection> =>
  friendLikes(await requireUserId(event), getRouterParam(event, 'id')!))
