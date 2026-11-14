import { eq } from 'drizzle-orm'

/** «Выйти на других устройствах»: новая эпоха сессий, это устройство остаётся (получает новую сессию) */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const db = useDb()
  const [user] = await db.update(schema.users).set({ sessionEpoch: Date.now() }).where(eq(schema.users.id, userId)).returning()
  if (!user) throw createError({ statusCode: 404, message: 'Пользователь не найден' })
  invalidateUserCache(userId)
  await startSession(event, user)
  return { ok: true }
})
