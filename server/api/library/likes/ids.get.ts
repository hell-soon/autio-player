export default defineEventHandler(async event => getLikedIds(await requireUserId(event)))
