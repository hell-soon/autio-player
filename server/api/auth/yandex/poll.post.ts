/** Опрос подтверждения кода. После подтверждения — вход/регистрация/привязка Яндекса. */
export default defineEventHandler(async (event) => {
  const raw = getCookie(event, 'ya_device')
  if (!raw) throw createError({ statusCode: 410, message: 'Код устарел — начните вход заново' })

  let state: { deviceCode: string, invite: string }
  try {
    state = JSON.parse(decrypt(raw))
  }
  catch {
    throw createError({ statusCode: 400, message: 'Повреждённые данные входа' })
  }

  const token = await yandexPollDeviceToken(state.deviceCode)
  if (!token) return { status: 'pending' as const }

  deleteCookie(event, 'ya_device', { path: '/api/auth/yandex' })
  const profile = await yandexProfile(token.access_token)
  const user = await signInWithAccount(event, {
    provider: 'yandex',
    providerUserId: profile.uid,
    displayName: profile.name,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
    premium: profile.hasPlus,
  }, state.invite)

  return { status: 'ok' as const, user: { id: user.id, name: user.name } }
})
