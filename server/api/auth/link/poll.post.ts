/** Новое устройство: подтвердили ли вход? { token } → pending | approved (сессия выставлена) | expired */
export default defineEventHandler(async (event) => {
  const { token } = await readBody<{ token?: unknown }>(event) ?? {}
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) throw createError({ statusCode: 400, message: 'Нет токена' })
  return pollLoginLink(event, token)
})
