export default defineEventHandler(async event => getPlaylist(await requireUserId(event), getRouterParam(event, 'id')!))
