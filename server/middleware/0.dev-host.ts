/**
 * Только для разработки: Spotify не принимает `localhost` в Redirect URI (только 127.0.0.1),
 * а cookie для localhost и 127.0.0.1 разные. Поэтому всегда работаем через 127.0.0.1.
 */
export default defineEventHandler((event) => {
  if (!import.meta.dev) return
  const url = getRequestURL(event)
  if (url.hostname !== 'localhost') return
  url.hostname = '127.0.0.1'
  return sendRedirect(event, url.toString(), 307)
})
