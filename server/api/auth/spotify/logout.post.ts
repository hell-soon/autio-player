/** Отключить Spotify от аккаунта (если это не единственный способ входа). */
export default defineEventHandler(async (event) => {
  await removeAccount(await requireUserId(event), 'spotify')
  return { ok: true }
})
