/** Настроен ли Last.fm на сайте и подключён ли у пользователя. */
export default defineEventHandler(async (event) => {
  const acc = await getAccount(await requireUserId(event), 'lastfm')
  return { enabled: lastfmConfig(event).enabled, connected: !!acc, name: acc?.displayName ?? null }
})
