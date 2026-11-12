export default defineEventHandler(async (event) => {
  const { name, description } = await readBody<{ name?: string, description?: string }>(event)
  const clean = String(name ?? '').trim().slice(0, 100)
  if (!clean) throw createError({ statusCode: 400, message: 'Укажите название' })
  await renamePlaylist(await requireUserId(event), getRouterParam(event, 'id')!, clean, description?.trim().slice(0, 300) || undefined)
  return { ok: true }
})
