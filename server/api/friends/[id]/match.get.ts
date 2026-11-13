/** Совпадение вкусов с другом: процент и общие исполнители. */
export default defineEventHandler(async (event): Promise<TasteMatch> =>
  tasteMatch(await requireUserId(event), getRouterParam(event, 'id')!))
