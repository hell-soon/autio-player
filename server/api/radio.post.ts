/**
 * Подбор музыки (радио Яндекса).
 *  { station: 'wave' }                 — «Моя волна»;
 *  { station: 'similar', seed: Track } — похожее на трек (трек Spotify сначала ищем в Яндексе);
 *  { station: 'id', id: 'genre:rock' } — станция из «Станций для вас»;
 *  { station: 'artist', name }         — по исполнителю (например, из топа Spotify).
 * exclude — uid уже стоящих в очереди треков.
 */
export default defineEventHandler(async (event): Promise<Track[]> => {
  const body = await readBody<{ station: 'wave' | 'similar' | 'id' | 'artist', seed?: Track, id?: string, name?: string, exclude?: string[] }>(event)
  const exclude = new Set(body.exclude ?? [])

  let station = 'user:onyourwave'
  let queueId: string | undefined

  if (body.station === 'similar' && body.seed) {
    const seed = body.seed
    let yandexId: string | null = seed.source === 'yandex' ? seed.sourceId : null
    yandexId ??= await findYandexMatch(event, { title: seed.title, artists: seed.artists, durationMs: seed.durationMs })
    if (yandexId) {
      const trackId = yandexId.split(':')[0]!
      station = `track:${trackId}`
      queueId = trackId
    }
  }
  else if (body.station === 'id' && body.id && /^[\w-]+:[\w-]+$/.test(body.id)) {
    station = body.id
  }
  else if (body.station === 'artist' && body.name) {
    const artistId = await yandexFindArtistId(event, body.name)
    if (!artistId) throw createError({ statusCode: 404, message: 'Исполнитель не найден в Яндекс Музыке' })
    station = `artist:${artistId}`
  }

  const tracks = await yandexStationTracks(event, station, queueId)
  return tracks.filter(t => !exclude.has(t.uid))
})
