/** «Общее у нас»: треки, которые есть и у вас, и у друга. */
export default defineEventHandler(async (event): Promise<Collection> =>
  commonTracks(await requireUserId(event), getRouterParam(event, 'id')!))
