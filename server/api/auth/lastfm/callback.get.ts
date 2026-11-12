export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const token = String(getQuery(event).token ?? '')
  if (!token) return sendRedirect(event, '/settings?error=' + encodeURIComponent('Last.fm: вход отменён'))
  try {
    const s = await lastfmGetSession(event, token)
    await saveAccount(userId, { provider: 'lastfm', providerUserId: s.name, displayName: s.name, accessToken: s.key, premium: false })
  }
  catch (e: any) {
    return sendRedirect(event, '/settings?error=' + encodeURIComponent(e?.message || 'Last.fm: не удалось подключить'))
  }
  return sendRedirect(event, '/settings')
})
