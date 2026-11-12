export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const track = await readTrackBody(event)
  await likeTrack(userId, track)
  // Лайк дублируется в сервис трека (Spotify / Яндекс) — без ожидания результата.
  event.waitUntil(syncLikeToService(event, userId, track, true))
  return { ok: true }
})
