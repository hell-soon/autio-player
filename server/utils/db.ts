import { mkdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import * as schema from '../db/schema'

export { schema }

type Db = ReturnType<typeof drizzleNeon<typeof schema>>
let instance: Db | null = null

/** Папка локальной базы (PGlite), если DATABASE_URL не задан. */
export const LOCAL_DB_DIR = '.data/pglite'

/**
 * База данных:
 *  - DATABASE_URL задан (Neon; на Vercel проставляется интеграцией Neon) — Postgres по HTTP;
 *  - не задан — PGlite: настоящий Postgres внутри Node, данные в .data/pglite. Ничего ставить не нужно.
 */
export function useDb(): Db {
  if (instance) return instance
  const url = useRuntimeConfig().db.url || process.env.DATABASE_URL
  if (url) {
    instance = drizzleNeon({ client: neon(url), schema })
  }
  else {
    mkdirSync(LOCAL_DB_DIR, { recursive: true })
    // API PGlite-драйвера совпадает с Neon (оба — Postgres в Drizzle).
    instance = drizzlePglite({ client: new PGlite(LOCAL_DB_DIR), schema }) as unknown as Db
  }
  return instance
}
