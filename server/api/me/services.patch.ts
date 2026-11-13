import { eq } from 'drizzle-orm'

/** Какими сервисами пользуется человек: { services: "yandex" | "spotify" | "both" }. Обновляет и сессию. */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const { services } = await readBody<{ services?: string }>(event) ?? {}
  if (services !== 'yandex' && services !== 'spotify' && services !== 'both') {
    throw createError({ statusCode: 400, message: 'Выберите: yandex, spotify или both' })
  }
  const db = useDb()
  await db.update(schema.users).set({ services }).where(eq(schema.users.id, userId))
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) })
  if (!user) throw createError({ statusCode: 404, message: 'Пользователь не найден' })
  await replaceUserSession(event, { user: sessionUser(user) })
  invalidateUserCache(userId)
  return { services }
})
