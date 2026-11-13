import { eq } from 'drizzle-orm'

/** Изменить приватность: { hideNowPlaying?, privateHistory? } */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const body = await readBody<{ hideNowPlaying?: unknown, privateHistory?: unknown }>(event) ?? {}
  const set: { hideNowPlaying?: boolean, privateHistory?: boolean } = {}
  if (typeof body.hideNowPlaying === 'boolean') set.hideNowPlaying = body.hideNowPlaying
  if (typeof body.privateHistory === 'boolean') set.privateHistory = body.privateHistory
  if (!Object.keys(set).length) throw createError({ statusCode: 400, message: 'Нечего менять' })
  await useDb().update(schema.users).set(set).where(eq(schema.users.id, userId))
  return { ok: true }
})
