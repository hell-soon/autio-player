import { and, eq, lt } from 'drizzle-orm'
import type { H3Event } from 'h3'

/**
 * Хранилище «вызовов» WebAuthn: между двумя запросами церемонии (в базе — на Vercel разные инстансы).
 * Одноразовые: при чтении удаляются. Живут 5 минут.
 */
export async function storeWebAuthnChallenge(_event: H3Event, challenge: string, attemptId: string) {
  const db = useDb()
  const now = Date.now()
  await db.delete(schema.webauthnChallenges).where(lt(schema.webauthnChallenges.expiresAt, now))
  await db.insert(schema.webauthnChallenges).values({ attemptId, challenge, expiresAt: now + 5 * 60_000 })
}

export async function takeWebAuthnChallenge(_event: H3Event, attemptId: string) {
  const [row] = await useDb().delete(schema.webauthnChallenges)
    .where(eq(schema.webauthnChallenges.attemptId, attemptId)).returning()
  if (!row || row.expiresAt < Date.now()) throw createError({ statusCode: 400, message: 'Время вышло — попробуйте ещё раз' })
  return row.challenge
}

export async function listPasskeys(userId: string) {
  const rows = await useDb().select().from(schema.passkeys).where(eq(schema.passkeys.userId, userId))
  return rows.map(r => ({ id: r.id, name: r.name ?? 'Ключ входа', createdAt: r.createdAt, lastUsedAt: r.lastUsedAt, synced: r.backedUp }))
}

export async function deletePasskey(userId: string, id: string) {
  const res = await useDb().delete(schema.passkeys)
    .where(and(eq(schema.passkeys.id, id), eq(schema.passkeys.userId, userId))).returning({ id: schema.passkeys.id })
  if (!res.length) throw createError({ statusCode: 404, message: 'Ключ не найден' })
}
