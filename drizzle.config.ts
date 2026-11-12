import { defineConfig } from 'drizzle-kit'

// Локально — файл .data/app.db, на проде — Turso (NUXT_DB_URL=libsql://..., NUXT_DB_AUTH_TOKEN=...).
// Применить схему: npm run db:push
export default defineConfig({
  dialect: 'turso',
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dbCredentials: {
    url: process.env.NUXT_DB_URL || 'file:.data/app.db',
    authToken: process.env.NUXT_DB_AUTH_TOKEN,
  },
})
