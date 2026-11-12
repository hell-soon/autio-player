export default defineEventHandler(async (event) => {
  await removeAccount(await requireUserId(event), 'lastfm')
  return { ok: true }
})
