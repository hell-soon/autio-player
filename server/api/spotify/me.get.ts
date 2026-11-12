/** Статус Spotify текущего пользователя: подключён ли и есть ли Premium (нужен для плеера). */
export default defineEventHandler(async (event) => {
  const acc = await getAccount(await requireUserId(event), 'spotify')
  if (!acc) return { connected: false as const }
  return { connected: true as const, name: acc.displayName ?? undefined, premium: acc.premium }
})
