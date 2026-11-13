/**
 * Единый поиск: Яндекс + Spotify, треки + альбомы + исполнители одним ответом.
 * Дубли (один и тот же трек/альбом/исполнитель в обоих сервисах) склеиваются:
 * остаётся версия из предпочитаемого сервиса (?prefer=yandex|spotify|auto; auto — Яндекс, он играет везде).
 */
export default defineEventHandler(async (event): Promise<SearchResult> => {
  const q = String(getQuery(event).q ?? '').trim()
  const prefer = String(getQuery(event).prefer ?? 'auto')
  const empty: SearchResult = { top: null, tracks: [], albums: [], artists: [] }
  if (!q) return empty

  const conn = await activeConnections(await requireUserId(event))
  const [y, s] = await Promise.all([
    conn.yandex ? yandexSearchAll(event, q).catch((e) => { console.warn('[search] yandex', e?.message); return empty }) : empty,
    conn.spotify ? spotifySearchAll(event, q).catch((e) => { console.warn('[search] spotify', e?.message); return empty }) : empty,
  ])

  const key = (...parts: (string | undefined)[]) => parts.map(p => normalize(p ?? '')).join('|')
  const dedupe = <T>(list: T[], k: (x: T) => string) => {
    const seen = new Set<string>()
    return list.filter((x) => {
      const id = k(x)
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
  }

  // Чередуем результаты, чтобы в начале были лучшие из обоих сервисов.
  const interleave = <T>(a: T[], b: T[]) => {
    const out: T[] = []
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i]) out.push(a[i]!)
      if (b[i]) out.push(b[i]!)
    }
    return out
  }

  // Предпочитаемый сервис идёт первым в каждой паре — при склейке дублей остаётся его версия.
  const [a, b] = prefer === 'spotify' ? [s, y] : [y, s]
  const tracks = dedupe(interleave(a.tracks, b.tracks), t => key(t.title, t.artists[0]))
  const albums = dedupe(interleave(a.albums, b.albums), x => key(x.title, x.artists[0]))
  const artists = dedupe(interleave(a.artists, b.artists), x => key(x.name))

  const top: SearchTop | null = y.top
    ?? (artists[0] && normalize(artists[0].name) === normalize(q) ? { kind: 'artist', artist: artists[0] } : null)
    ?? (tracks[0] ? { kind: 'track', track: tracks[0] } : null)

  return { top, tracks: tracks.slice(0, 30), albums: albums.slice(0, 20), artists: artists.slice(0, 16) }
})
