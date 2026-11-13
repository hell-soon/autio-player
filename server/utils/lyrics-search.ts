import type { H3Event } from 'h3'

/**
 * Поиск песни по строчке из текста.
 *  1. Genius (если задан NUXT_GENIUS_TOKEN) — официальный API, хорошо ищет по текстам песен;
 *     найденная песня сопоставляется с треком Яндекса/Spotify, чтобы её можно было включить.
 *  2. Яндекс — кандидаты из обычного поиска проверяются по тексту (Яндекс/LRCLIB):
 *     в выдачу попадают только треки, в тексте которых действительно есть фраза.
 * LRCLIB по тексту не ищет (параметр q — только название/исполнитель/альбом), поэтому используется лишь для проверки.
 */

const GENIUS = 'https://api.genius.com'

interface GeniusHit { title: string, artist: string }

async function geniusSearch(token: string, q: string): Promise<GeniusHit[]> {
  const res = await $fetch<{ response?: { hits?: { type?: string, result?: { title?: string, primary_artist?: { name?: string } } }[] } }>(`${GENIUS}/search`, {
    query: { q },
    headers: { Authorization: `Bearer ${token}` },
    timeout: 8000,
  })
  return (res.response?.hits ?? []).flatMap((h) => {
    const r = h.result
    return h.type === 'song' && r?.title && r.primary_artist?.name ? [{ title: r.title, artist: r.primary_artist.name }] : []
  })
}

/** Строка текста, содержащая фразу (фраза может переходить через строку — тогда первая из двух). */
function matchLine(l: Lyrics | null, want: string): string | null {
  if (!l) return null
  const lines = (l.synced?.map(x => x.text) ?? l.plain?.split(/\r?\n/) ?? []).filter(Boolean)
  for (let i = 0; i < lines.length; i++) {
    const one = normalize(lines[i]!)
    const two = `${one} ${normalize(lines[i + 1] ?? '')}`
    if (one.includes(want) || two.includes(want)) return lines[i]!
  }
  return null
}

/** Песню, найденную на Genius, — в трек, который можно включить: сначала Яндекс, потом Spotify. */
async function resolveTrack(event: H3Event, hit: GeniusHit, conn: { yandex: boolean, spotify: boolean }): Promise<Track | null> {
  const title = normalize(hit.title)
  const artist = normalize(hit.artist)
  const pick = (list: Track[]) =>
    list.find(t => normalize(t.title) === title && t.artists.some(a => normalize(a) === artist))
    ?? list.find(t => normalize(t.title) === title)
    ?? null
  if (conn.yandex) {
    const { tracks } = await yandexSearch(event, `${hit.artist} ${hit.title}`).catch(() => ({ tracks: [] as Track[] }))
    const t = pick(tracks)
    if (t) return t
  }
  if (conn.spotify) {
    const { tracks } = await spotifySearch(event, `${hit.title} ${hit.artist}`).catch(() => ({ tracks: [] as Track[] }))
    return pick(tracks)
  }
  return null
}

export async function searchByLyrics(event: H3Event, userId: string, q: string): Promise<LyricsSearchHit[]> {
  const want = normalize(q)
  // Слишком короткая фраза совпадёт с чем угодно
  if (want.length < 6) return []

  const conn = await activeConnections(userId)
  const token = String(useRuntimeConfig(event).genius.token || '')

  const [genius, candidates] = await Promise.all([
    token ? geniusSearch(token, q).catch((e) => { console.warn('[lyrics-search] genius', e?.statusCode ?? '', e?.message); return [] }) : [],
    conn.yandex ? yandexSearch(event, q).then(r => r.tracks.slice(0, 8)).catch(() => [] as Track[]) : [],
  ])

  const [verified, resolved] = await Promise.all([
    mapLimit(candidates, 4, async (t) => {
      const line = matchLine(await findLyrics(event, t).catch(() => null), want)
      return line ? { track: t, line } : null
    }),
    mapLimit(genius.slice(0, 6), 3, async (g) => {
      const track = await resolveTrack(event, g, { yandex: !!conn.yandex, spotify: !!conn.spotify })
      return track ? { track } : null
    }),
  ])

  // Проверенные по тексту — выше; дубли (один трек из обоих источников) склеиваются
  const seen = new Set<string>()
  return [...verified, ...resolved].filter((h): h is LyricsSearchHit => {
    if (!h) return false
    const key = `${normalize(h.track.title)}|${normalize(h.track.artists[0] ?? '')}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
