/** «Вам прислали»: последние 30 треков от друзей. */
export default defineEventHandler(async (event): Promise<ShareInfo[]> => incomingShares(await requireUserId(event)))
