/** Вошедшее устройство: «Разрешить вход» по коду { code } */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const { code } = await readBody<{ code?: unknown }>(event) ?? {}
  return approveLoginLink(userId, parseLinkCode(code))
})
