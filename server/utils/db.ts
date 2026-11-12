import { mkdirSync } from 'node:fs'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from '../db/schema'

export { schema }

let instance: ReturnType<typeof drizzle<typeof schema>> | null = null

/** Один клиент БД на инстанс сервера (локально — файл, на Vercel — Turso по HTTP). */
export function useDb() {
  if (instance) return instance
  const { db } = useRuntimeConfig()
  const url = db.url || 'file:.data/app.db'
  if (url.startsWith('file:')) mkdirSync('.data', { recursive: true })
  const client = createClient({ url, authToken: db.authToken || undefined })
  instance = drizzle({ client, schema })
  return instance
}
