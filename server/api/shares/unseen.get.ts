/** Число непросмотренных присланных треков — для значка в навигации. */
export default defineEventHandler(async (event) => ({ count: await unseenSharesCount(await requireUserId(event)) }))
