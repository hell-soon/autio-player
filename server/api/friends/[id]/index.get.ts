/** Профиль друга: сейчас играет, недавнее, топ исполнителей, плейлисты (с учётом его приватности). */
export default defineEventHandler(async (event): Promise<FriendProfile> =>
  friendProfile(await requireUserId(event), getRouterParam(event, 'id')!))
