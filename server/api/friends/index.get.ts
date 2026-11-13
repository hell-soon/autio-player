/** Друзья (все пользователи сайта) и что у них играет сейчас. */
export default defineEventHandler(async (event): Promise<FriendInfo[]> => listFriends(await requireUserId(event)))
