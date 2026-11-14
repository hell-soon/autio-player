import { and, eq, gt, isNull, lt } from 'drizzle-orm'
import { createHash, randomBytes, randomInt } from 'node:crypto'
import type { H3Event } from 'h3'

/**
 * Вход с другого устройства (как в Telegram / на телевизоре):
 *  1) новое устройство: start → { code: "482913", token } — показывает код и QR;
 *  2) вошедшее устройство: approve(code) — человек нажал «Разрешить»;
 *  3) новое устройство опрашивает poll(token) → сессия этого пользователя.
 * Код живёт 3 минуты и срабатывает один раз; token — секрет только нового устройства (в базе — sha-256).
 */
export const LINK_TTL_MS = 3 * 60_000
const { loginCodes, users } = schema

const sha = (s: string) => createHash('sha256').update(s).digest('hex')

export async function startLoginLink(event: H3Event) {
  const db = useDb()
  const now = Date.now()
  // Уборка: старше часа — не нужны
  await db.delete(loginCodes).where(lt(loginCodes.expiresAt, now - 3_600_000))
  // Код не должен совпасть с другим действующим
  let code = ''
  for (let i = 0; i < 5; i++) {
    code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const busy = await db.select({ c: loginCodes.code }).from(loginCodes)
      .where(and(eq(loginCodes.code, code), gt(loginCodes.expiresAt, now))).limit(1)
    if (!busy.length) break
  }
  const token = randomBytes(32).toString('base64url')
  await db.insert(loginCodes).values({
    tokenHash: sha(token),
    code,
    device: deviceLabel(event),
    createdAt: now,
    expiresAt: now + LINK_TTL_MS,
  })
  return { code, token, expiresAt: now + LINK_TTL_MS }
}

/** Опрос нового устройства. approved → сессия уже выставлена */
export async function pollLoginLink(event: H3Event, token: string): Promise<{ status: 'pending' | 'approved' | 'expired' }> {
  const db = useDb()
  const row = await db.query.loginCodes.findFirst({ where: eq(loginCodes.tokenHash, sha(token)) })
  if (!row || row.usedAt || row.expiresAt < Date.now()) return { status: 'expired' }
  if (!row.approvedBy) return { status: 'pending' }
  // Одноразово: помечаем использованным условно — второй параллельный опрос сессию не получит
  const used = await db.update(loginCodes).set({ usedAt: Date.now() })
    .where(and(eq(loginCodes.tokenHash, row.tokenHash), isNull(loginCodes.usedAt))).returning({ t: loginCodes.tokenHash })
  if (!used.length) return { status: 'expired' }
  const user = await db.query.users.findFirst({ where: eq(users.id, row.approvedBy) })
  if (!user) return { status: 'expired' }
  await startSession(event, user)
  return { status: 'approved' }
}

const activeByCode = (code: string) => and(
  eq(loginCodes.code, code),
  gt(loginCodes.expiresAt, Date.now()),
  isNull(loginCodes.usedAt),
)

/** Что за устройство просит вход (для экрана подтверждения) */
export async function loginLinkInfo(code: string) {
  const row = await useDb().query.loginCodes.findFirst({ where: activeByCode(code) })
  if (!row) throw createError({ statusCode: 404, message: 'Код не найден или устарел — обновите его на новом устройстве' })
  return { device: row.device ?? 'Устройство', createdAt: row.createdAt, approved: !!row.approvedBy }
}

export async function approveLoginLink(userId: string, code: string) {
  const res = await useDb().update(loginCodes).set({ approvedBy: userId })
    .where(and(activeByCode(code), isNull(loginCodes.approvedBy))).returning({ device: loginCodes.device })
  if (!res.length) throw createError({ statusCode: 404, message: 'Код не найден или устарел — обновите его на новом устройстве' })
  return { device: res[0]!.device ?? 'Устройство' }
}

/** 6 цифр (пробелы и дефисы, которые человек мог ввести, убираем) */
export function parseLinkCode(v: unknown) {
  const code = String(v ?? '').replace(/\D/g, '')
  if (code.length !== 6) throw createError({ statusCode: 400, message: 'Код — 6 цифр' })
  return code
}
