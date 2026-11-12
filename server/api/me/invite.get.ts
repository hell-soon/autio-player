import { eq } from 'drizzle-orm'

/** Код приглашения — только владельцу сайта (чтобы поделиться ссылкой с друзьями). */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const user = await useDb().query.users.findFirst({ where: eq(schema.users.id, userId) })
  if (user?.role !== 'owner') return { owner: false as const }
  const code = String(useRuntimeConfig(event).inviteCode || '')
  return { owner: true as const, code: code || null }
})
