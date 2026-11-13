/** Что играет у друга прямо сейчас — для «Слушать вместе» (опрашивается раз в несколько секунд). */
export default defineEventHandler(async (event): Promise<FriendNowPlaying | null> =>
  friendNowPlaying(await requireUserId(event), getRouterParam(event, 'id')!))
