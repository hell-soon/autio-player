/**
 * Access token для Web Playback SDK в браузере (SDK без него не работает).
 * Отдаём только короткоживущий access token; refresh token и секрет остаются на сервере.
 */
export default defineEventHandler(async (event) => {
  const { accessToken, expiresAt } = await getSpotifyToken(event)
  setHeader(event, 'Cache-Control', 'no-store')
  return { accessToken, expiresAt }
})
