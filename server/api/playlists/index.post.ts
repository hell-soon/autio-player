export default defineEventHandler(async (event) => {
  const { name } = await readBody<{ name?: string }>(event)
  const clean = String(name ?? '').trim().slice(0, 100)
  if (!clean) throw createError({ statusCode: 400, message: 'Укажите название' })
  return createPlaylist(await requireUserId(event), clean)
})
