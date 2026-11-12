import type { H3Event } from 'h3'

/**
 * Поиск того же трека в Яндекс Музыке по названию, исполнителям и длительности.
 * Нужен, чтобы треки Spotify играли там, где Spotify SDK недоступен (телефон, блокировки).
 */

/** "Song (feat. X) - Remastered 2011" → "song" */
export function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s[-–—]\s.*(remaster|version|edit|mix|live|mono|stereo|версия).*$/i, '')
    .replace(/[([{].*?[)\]}]/g, ' ')
    .replace(/\b(feat|ft|featuring)\b.*$/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function tokens(s: string) {
  return new Set(normalize(s).split(' ').filter(Boolean))
}

function similarity(a: string, b: string) {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.8
  const ta = tokens(a)
  const tb = tokens(b)
  const common = [...ta].filter(t => tb.has(t)).length
  return common / Math.max(ta.size, tb.size)
}

function durationScore(a: number, b: number) {
  if (!a || !b) return 0.5
  const diff = Math.abs(a - b)
  if (diff <= 2000) return 1
  if (diff <= 5000) return 0.7
  if (diff <= 10_000) return 0.3
  return 0
}

export interface MatchQuery {
  title: string
  artists: string[]
  durationMs: number
}

function score(q: MatchQuery, t: Track) {
  const title = similarity(q.title, t.title)
  const artist = Math.max(0, ...q.artists.flatMap(a => t.artists.map(b => similarity(a, b))))
  return title * 0.45 + artist * 0.35 + durationScore(q.durationMs, t.durationMs) * 0.2
}

// Небольшой кэш в памяти инстанса: повторное проигрывание не ищет заново.
const cache = new Map<string, string | null>()
const MAX_CACHE = 500

export async function findYandexMatch(event: H3Event, q: MatchQuery): Promise<string | null> {
  const key = `${q.artists.join('|')}::${q.title}::${q.durationMs}`.toLowerCase()
  if (cache.has(key)) return cache.get(key)!

  const titleForSearch = normalize(q.title) || q.title
  const { tracks } = await yandexSearch(event, `${q.artists[0] ?? ''} ${titleForSearch}`.trim())

  let best: { id: string, s: number } | null = null
  for (const t of tracks) {
    const s = score(q, t)
    if (!best || s > best.s) best = { id: t.sourceId, s }
  }
  const result = best && best.s >= 0.55 ? best.id : null

  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!)
  cache.set(key, result)
  return result
}
