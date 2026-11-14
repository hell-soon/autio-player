/** Удалить ключ входа */
export default defineEventHandler(async (event) => {
  await deletePasskey(await requireUserId(event), decodeURIComponent(getRouterParam(event, 'id')!))
  return { ok: true }
})
