import { sql } from 'drizzle-orm'
import { explainError } from '~~/server/utils/explain-error'

/**
 * Диагностика: открыть /api/debug/status, когда «ничего не играет».
 * Проверяет схему базы (всё ли применено через db:push) и доступ к Яндексу/Spotify текущего пользователя.
 * Только для вошедших; токены и секреты не показывает.
 */
const EXPECTED: Record<string, string[]> = {
  users: ['services', 'onboarded', 'hide_now_playing', 'private_history'],
  accounts: ['likes_synced_at'],
  mixes: ['period'],
  shares: ['note'],
}

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const result: Record<string, unknown> = { version: useRuntimeConfig().public.appVersion }

  // 1. Схема базы
  try {
    const rows = await useDb().execute(sql`select table_name, column_name from information_schema.columns where table_schema = 'public'`) as unknown as { rows: { table_name: string, column_name: string }[] }
    const have = new Set(rows.rows.map(r => `${r.table_name}.${r.column_name}`))
    const missing = Object.entries(EXPECTED).flatMap(([t, cols]) => cols.filter(c => !have.has(`${t}.${c}`)).map(c => `${t}.${c}`))
    result.database = missing.length ? { ok: false, missing, fix: 'npm run db:push' } : { ok: true }
  }
  catch (e: any) {
    result.database = { ok: false, error: explainError(e).message }
  }

  // 2. Яндекс: аккаунт и запрос статуса
  try {
    const acc = await getAccount(userId, 'yandex')
    if (!acc) result.yandex = { ok: false, error: 'не подключён' }
    else {
      const s = await yandexAccountStatus(event)
      result.yandex = { ok: true, plus: s.hasPlus }
    }
  }
  catch (e: any) {
    result.yandex = { ok: false, error: explainError(e).message }
  }

  // 3. Spotify
  try {
    const acc = await getAccount(userId, 'spotify')
    if (!acc) result.spotify = { ok: false, error: 'не подключён' }
    else {
      await spotifyFetch(event, '/me')
      result.spotify = { ok: true, premium: acc.premium }
    }
  }
  catch (e: any) {
    result.spotify = { ok: false, error: explainError(e).message }
  }

  return result
})
