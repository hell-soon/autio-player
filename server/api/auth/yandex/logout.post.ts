/** Отключить Яндекс от аккаунта (если это не единственный способ входа). */
export default defineEventHandler(async (event) => {
  await removeAccount(await requireUserId(event), 'yandex')
  return { ok: true }
})
