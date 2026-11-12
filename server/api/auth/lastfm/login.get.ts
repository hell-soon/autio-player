/** Подключение Last.fm (только для вошедшего пользователя). */
export default defineEventHandler(async (event) => {
  await requireUserId(event)
  if (!lastfmConfig(event).enabled) throw createError({ statusCode: 500, message: 'Last.fm не настроен (NUXT_LASTFM_API_KEY / NUXT_LASTFM_SECRET)' })
  return sendRedirect(event, lastfmAuthUrl(event))
})
