import { eq } from 'drizzle-orm'

/** Настройки приватности для друзей. */
export default defineEventHandler(async (event) => {
  const u = await useDb().query.users.findFirst({ where: eq(schema.users.id, await requireUserId(event)) })
  return { hideNowPlaying: u?.hideNowPlaying ?? false, privateHistory: u?.privateHistory ?? false }
})
