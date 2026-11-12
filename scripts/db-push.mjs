/**
 * Применить схему базы (drizzle-kit push).
 *  - DATABASE_URL / NUXT_DB_URL задан (Neon) — в облачную базу;
 *  - не задан — в локальную PGlite (.data/pglite); папка создаётся сама.
 * Флаг --local-only (используется в `npm run dev`): облачную базу не трогать, только локальную.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

try {
  process.loadEnvFile?.('.env')
}
catch {}

const url = process.env.NUXT_DB_URL || process.env.DATABASE_URL
const localOnly = process.argv.includes('--local-only')

if (url && localOnly) process.exit(0)
if (!url) mkdirSync('.data/pglite', { recursive: true })

const res = spawnSync('npx', ['drizzle-kit', 'push'], { stdio: 'inherit', shell: process.platform === 'win32' })
process.exit(res.status ?? 1)
