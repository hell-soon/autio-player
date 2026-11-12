export default defineEventHandler(async event => listPlaylists(await requireUserId(event)))
