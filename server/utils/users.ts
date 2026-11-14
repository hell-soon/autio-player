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
      // Вошёл через Яндекс — интерфейс сразу без Spotify (и наоборот); поменять можно в настройках
      services: data.provider === 'lastfm' ? null : data.provider,
      onboarded: false,
      createdAt: Date.now(),
    })
  }

  await saveAccount(userId, data)

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) throw createError({ statusCode: 500, message: 'Пользователь не найден' })
  // Сам подключил второй музыкальный сервис — значит, пользуется обоими
  if (session.user && user.services && data.provider !== 'lastfm' && user.services !== data.provider) {
    await db.update(users).set({ services: 'both' }).where(eq(users.id, userId))
    user.services = 'both'
  }
  // Аватар из Spotify подтягиваем, если своего ещё нет.
  if (!user.avatarUrl && data.avatarUrl) {
    await db.update(users).set({ avatarUrl: data.avatarUrl }).where(eq(users.id, userId))
    user.avatarUrl = data.avatarUrl
  }
  await replaceUserSession(event, { user: sessionUser(user) })
  return user
}

/** Что кладётся в сессию (cookie): читается клиентом без запросов, в т.ч. при SSR */
export function sessionUser(u: { id: string, name: string, avatarUrl: string | null, services: MusicServices | null, onboarded: boolean }) {
  return { id: u.id, name: u.name, avatarUrl: u.avatarUrl ?? undefined, services: u.services ?? 'both', onboarded: u.onboarded }
}

/** Какими сервисами пользуется человек (старые пользователи без настройки — обоими). */
export async function getMusicServices(userId: string) {
  const u = await useDb().query.users.findFirst({ where: eq(users.id, userId), columns: { services: true } })
  const s = u?.services ?? 'both'
  return { yandex: s !== 'spotify', spotify: s !== 'yandex' }
}

/**
 * Подключённые сервисы, которыми человек пользуется: для подборок и поиска.
 * Spotify подключён, но выбран «Только Яндекс» — из Spotify ничего не показываем.
 */
export async function activeConnections(userId: string) {
  const [conn, use] = await Promise.all([listConnections(userId), getMusicServices(userId)])
  return { ...conn, spotify: use.spotify ? conn.spotify : null, yandex: use.yandex ? conn.yandex : null }
}

export async function saveAccount(userId: string, data: AccountData) {
  forgetAccount(userId, data.provider)
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
  likesSyncedAt: number | null
}

/**
 * Кэш подключённых аккаунтов в памяти инстанса (60 с): каждый запуск трека и запрос к Яндексу/Spotify
 * берёт токен отсюда, а не из базы (Neon — отдельный сетевой запрос). Сбрасывается при любом изменении аккаунта.
 */
const accountCache = new Map<string, { at: number, value: StoredAccount | null }>()
const ACCOUNT_TTL_MS = 60_000
export function forgetAccount(userId: string, provider?: Provider) {
  for (const k of accountCache.keys()) if (k.startsWith(`${userId}:`) && (!provider || k === `${userId}:${provider}`)) accountCache.delete(k)
}

export async function getAccount(userId: string, provider: Provider): Promise<StoredAccount | null> {
  const key = `${userId}:${provider}`
  const hit = accountCache.get(key)
  if (hit && Date.now() - hit.at < ACCOUNT_TTL_MS) return hit.value
  const value = await loadAccount(userId, provider)
  accountCache.set(key, { at: Date.now(), value })
  if (accountCache.size > 500) accountCache.delete(accountCache.keys().next().value!)
  return value
}

async function loadAccount(userId: string, provider: Provider): Promise<StoredAccount | null> {
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
    likesSyncedAt: a.likesSyncedAt,
  }
}

export async function updateAccountTokens(userId: string, provider: Provider, t: { accessToken: string, refreshToken?: string | null, expiresAt?: number | null }) {
  forgetAccount(userId, provider)
  await useDb().update(accounts).set({
    accessToken: encrypt(t.accessToken),
    ...(t.refreshToken ? { refreshToken: encrypt(t.refreshToken) } : {}),
    expiresAt: t.expiresAt ?? null,
    updatedAt: Date.now(),
  }).where(and(eq(accounts.userId, userId), eq(accounts.provider, provider)))
}

export async function removeAccount(userId: string, provider: Provider) {
  forgetAccount(userId, provider)
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
