import { sql } from 'drizzle-orm'

/** Для страницы входа: нужен ли код приглашения новым пользователям. */
export default defineEventHandler(async () => {
  const [{ n }] = await useDb().select({ n: sql<number>`count(*)` }).from(schema.users) as [{ n: number }]
  return {
    firstUser: n === 0,
    inviteRequired: n > 0,
    spotifyEnabled: Boolean(useRuntimeConfig().spotify.clientId),
  }
})
