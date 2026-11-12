import { and, count, eq } from 'drizzle-orm'
import type { H3Event } from 'h3'

const { users, accounts } = schema

export type Provider = 'spotify' | 'yandex' | 'lastfm'

/** id текущего пользователя (middleware уже проверил сессию для /api/*). */
export async function requireUserId(event: H3Event) {
  const { user } = await requireUserSession(event)
  return user.id
}

export interface AccountData {
  provider: Provider
  providerUserId: string
  displayName?: string
  avatarUrl?: string
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  premium: boolean
  scope?: string
}

/**
 * Вход / регистрация / привязка через сервис:
 *  - пользователь уже вошёл → сервис привязывается к нему;
 *  - аккаунт сервиса известен → вход в его пользователя;
 *  - иначе регистрация: первый пользователь — владелец, остальные — по коду приглашения.
 */
export async function signInWithAccount(event: H3Event, data: AccountData, invite?: string) {
  const db = useDb()
  const session = await getUserSession(event)
  const existing = await db.query.accounts.findFirst({
    where: and(eq(accounts.provider, data.provider), eq(accounts.providerUserId, data.providerUserId)),
  })

  let userId: string
  if (session.user) {
    userId = session.user.id
    if (existing && existing.userId !== userId) {
      throw createError({ statusCode: 409, message: 'Этот аккаунт уже привязан к другому пользователю' })
    }
  }
  else if (existing) {
    userId = existing.userId
  }
  else {
    const [{ n }] = await db.select({ n: count() }).from(users) as [{ n: number }]
    const isFirst = n === 0
    const code = String(useRuntimeConfig(event).inviteCode || '')
    if (!isFirst && (!code || invite?.trim() !== code)) {
      throw createError({ statusCode: 403, message: code ? 'Нужен правильный код приглашения' : 'Регистрация закрыта' })
    }
    userId = crypto.randomUUID()
    await db.insert(users).values({
      id: userId,
      name: data.displayName || 'Слушатель',
      avatarUrl: data.avatarUrl ?? null,
      role: isFirst ? 'owner' : 'user',
      createdAt: Date.now(),
    })
  }

  await saveAccount(userId, data)

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) throw createError({ statusCode: 500, message: 'Пользователь не найден' })
  // Аватар из Spotify подтягиваем, если своего ещё нет.
  if (!user.avatarUrl && data.avatarUrl) {
    await db.update(users).set({ avatarUrl: data.avatarUrl }).where(eq(users.id, userId))
    user.avatarUrl = data.avatarUrl
  }
  await replaceUserSession(event, { user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl ?? undefined } })
  return user
}

export async function saveAccount(userId: string, data: AccountData) {
  const row = {
    userId,
    provider: data.provider,
    providerUserId: data.providerUserId,
    displayName: data.displayName ?? null,
    accessToken: encrypt(data.accessToken),
    refreshToken: data.refreshToken ? encrypt(data.refreshToken) : null,
    expiresAt: data.expiresAt ?? null,
    premium: data.premium,
    scope: data.scope ?? null,
    updatedAt: Date.now(),
  }
  await useDb().insert(accounts).values(row).onConflictDoUpdate({
    target: [accounts.userId, accounts.provider],
    set: row,
  })
  // Подключили/переподключили сервис — персональные подборки и кэши нужно собрать заново.
  invalidateUserCache(userId)
}

export interface StoredAccount {
  providerUserId: string
  displayName: string | null
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null
  premium: boolean
  scope: string | null
}

export async function getAccount(userId: string, provider: Provider): Promise<StoredAccount | null> {
  const a = await useDb().query.accounts.findFirst({
    where: and(eq(accounts.userId, userId), eq(accounts.provider, provider)),
  })
  if (!a) return null
  return {
    providerUserId: a.providerUserId,
    displayName: a.displayName,
    accessToken: decrypt(a.accessToken),
    refreshToken: a.refreshToken ? decrypt(a.refreshToken) : null,
    expiresAt: a.expiresAt,
    premium: a.premium,
    scope: a.scope,
  }
}

export async function updateAccountTokens(userId: string, provider: Provider, t: { accessToken: string, refreshToken?: string | null, expiresAt?: number | null }) {
  await useDb().update(accounts).set({
    accessToken: encrypt(t.accessToken),
    ...(t.refreshToken ? { refreshToken: encrypt(t.refreshToken) } : {}),
    expiresAt: t.expiresAt ?? null,
    updatedAt: Date.now(),
  }).where(and(eq(accounts.userId, userId), eq(accounts.provider, provider)))
}

export async function removeAccount(userId: string, provider: Provider) {
  const db = useDb()
  const all = await db.select({ provider: accounts.provider }).from(accounts).where(eq(accounts.userId, userId))
  const logins = all.filter(a => a.provider !== 'lastfm')
  if (provider !== 'lastfm' && logins.length <= 1) {
    throw createError({ statusCode: 400, message: 'Нельзя отключить единственный способ входа' })
  }
  await db.delete(accounts).where(and(eq(accounts.userId, userId), eq(accounts.provider, provider)))
  invalidateUserCache(userId)
}

export async function listConnections(userId: string) {
  const rows = await useDb()
    .select({ provider: accounts.provider, displayName: accounts.displayName, premium: accounts.premium })
    .from(accounts)
    .where(eq(accounts.userId, userId))
  return {
    spotify: rows.find(r => r.provider === 'spotify') ?? null,
    yandex: rows.find(r => r.provider === 'yandex') ?? null,
    lastfm: rows.find(r => r.provider === 'lastfm') ?? null,
  }
}
