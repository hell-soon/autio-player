import { defineConfig } from 'drizzle-kit'

// drizzle-kit сам не читает .env — подхватываем DATABASE_URL оттуда.
try {
  process.loadEnvFile?.('.env')
}
catch {}

const url = process.env.NUXT_DB_URL || process.env.DATABASE_URL

export default defineConfig(url
  ? {
    dialect: 'postgresql',
    schema: './server/db/schema.ts',
    out: './server/db/migrations',
    dbCredentials: { url },
  }
  : {
    dialect: 'postgresql',
    driver: 'pglite',
    schema: './server/db/schema.ts',
    out: './server/db/migrations',
    dbCredentials: { url: './.data/pglite' },
  })
