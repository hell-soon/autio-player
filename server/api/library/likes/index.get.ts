export default defineEventHandler(async event => getLikedTracks(await requireUserId(event)))
