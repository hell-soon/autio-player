export default defineEventHandler(async (event) => {
  const { code, state, error } = getQuery(event)
  const raw = getCookie(event, 'spotify_oauth')
  deleteCookie(event, 'spotify_oauth', { path: '/api/auth/spotify' })

  const session = await getUserSession(event)
  // Ошибки показываем там, откуда пришли: в настройках (привязка) или на странице входа.
  const back = session.user ? '/settings' : '/login'
  const fail = (msg: string) => sendRedirect(event, `${back}?error=${encodeURIComponent(msg)}`)

  if (error) return fail(error === 'access_denied' ? 'Вы отменили вход в Spotify' : String(error))

  let saved: { state: string, invite: string } | null = null
  try {
    saved = raw ? JSON.parse(decrypt(raw)) : null
  }
  catch {}
  if (!code || !state || !saved || saved.state !== state) return fail('Сессия входа устарела — попробуйте ещё раз')

  try {
    const t = await spotifyExchangeCode(event, String(code))
    const me = await spotifyProfile(t.access_token)
    await signInWithAccount(event, {
      provider: 'spotify',
      providerUserId: me.id,
      displayName: me.display_name || me.id,
      avatarUrl: me.images?.[0]?.url,
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresAt: Date.now() + t.expires_in * 1000,
      premium: me.product === 'premium',
      scope: t.scope,
    }, saved.invite)
  }
  catch (err: any) {
    return fail(err?.message || 'Не удалось войти через Spotify')
  }

  return sendRedirect(event, session.user ? '/settings' : '/')
})
