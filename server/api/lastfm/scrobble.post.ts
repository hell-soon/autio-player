/**
 * Скробблинг в Last.fm. type: 'now' — «сейчас играет», 'scrobble' — засчитать прослушивание.
 * Если Last.fm не подключён — тихо ничего не делаем.
 */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const acc = await getAccount(userId, 'lastfm')
  if (!acc || !lastfmConfig(event).enabled) return { ok: false }
  const { type, startedAt } = await readBody<{ type: 'now' | 'scrobble', startedAt?: number }>(event)
  const track = await readTrackBody(event)
  try {
    if (type === 'now') await lastfmNowPlaying(event, acc.accessToken, track)
    else await lastfmScrobble(event, acc.accessToken, track, Number(startedAt) || Date.now())
    return { ok: true }
  }
  catch (e: any) {
    console.warn('[lastfm]', e?.message)
    return { ok: false }
  }
})
