/**
 * «Больше не предлагать»: дизлайк трека в Яндексе — радио и «Моя волна» перестают его предлагать.
 * { track, undo?: true } — undo снимает дизлайк («Отменить»).
 * Трек Spotify сначала ищем в Яндексе; не нашли — дизлайк только на сайте (клиент запомнит сам).
 */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const track = await readTrackBody(event)
  const { undo } = await readBody<{ undo?: boolean }>(event) ?? {}
  const acc = await getAccount(userId, 'yandex')
  if (!acc) return { ok: true, synced: false }
  const yid = track.source === 'yandex'
    ? track.sourceId
    : await findYandexMatch(event, { title: track.title, artists: track.artists, durationMs: track.durationMs })
  if (!yid) return { ok: true, synced: false }
  await ymPostForm(event, `/users/${acc.providerUserId}/dislikes/tracks/${undo ? 'remove' : 'add-multiple'}`, { 'track-ids': yid })
  // Подборки собраны с учётом старых предпочтений — пересоберём
  invalidateUserCache(userId)
  return { ok: true, synced: true }
})
