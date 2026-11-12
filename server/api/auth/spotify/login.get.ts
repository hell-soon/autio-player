import { randomBytes } from 'node:crypto'

/** Вход через Spotify или привязка к текущему пользователю (если он уже вошёл). */
export default defineEventHandler((event) => {
  const { invite } = getQuery(event)
  const state = randomBytes(16).toString('hex')
  setCookie(event, 'spotify_oauth', encrypt(JSON.stringify({ state, invite: String(invite ?? '') })), {
    httpOnly: true,
    sameSite: 'lax',
    secure: getRequestURL(event).protocol === 'https:',
    maxAge: 600,
    path: '/api/auth/spotify',
  })
  return sendRedirect(event, spotifyAuthorizeUrl(event, state))
})
