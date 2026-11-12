export default defineEventHandler(async event => cached(`u:${await requireUserId(event)}:spl`, 10 * 60_000, () => spotifyMyPlaylists(event)))
