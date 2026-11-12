import { createHmac } from 'node:crypto'
import type { H3Event } from 'h3'

/**
 * Тексты песен: сначала Яндекс Музыка (синхронизированный LRC), затем открытая база LRCLIB.
 * Подпись запроса к Яндексу — как у официального Android-клиента (MarshalX/yandex-music-api).
 */

const LYRICS_SIGN_KEY = 'p93jhgh689SBReK6ghtw62'
const LRCLIB = 'https://lrclib.net/api'
// LRCLIB просит указывать приложение в User-Agent (без личных данных).
const UA = 'AudioWeb/1.0 (personal music player)'

/** "[01:23.45]текст" → [{ t: 83450, text }] (поддерживает несколько меток на строке). */
export function parseLrc(lrc: string): LyricsLine[] {
  const lines: LyricsLine[] = []
  for (const raw of lrc.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)]
    if (!stamps.length) continue
    const text = raw.replace(/\[[^\]]*\]/g, '').trim()
    for (const m of stamps) {
      const frac = m[3] ? Number(m[3].padEnd(3, '0')) : 0
      lines.push({ t: Number(m[1]) * 60_000 + Number(m[2]) * 1000 + frac, text })
    }
  }
  return lines.sort((a, b) => a.t - b.t)
}

async function yandexLyrics(event: H3Event, yandexTrackId: string): Promise<Lyrics | null> {
  const trackId = yandexTrackId.split(':')[0]!
  const ts = Math.floor(Date.now() / 1000)
  const sign = createHmac('sha256', LYRICS_SIGN_KEY).update(`${trackId}${ts}`).digest('base64')
  const res = await ymGet<{ result?: { downloadUrl?: string } }>(event, `/tracks/${trackId}/lyrics`, { format: 'LRC', timeStamp: ts, sign })
  const url = res.result?.downloadUrl
  if (!url) return null
  const text = await $fetch<string>(url, { responseType: 'text', timeout: 10_000 })
  const synced = parseLrc(text)
  return synced.length
    ? { synced, plain: null, source: 'Яндекс Музыка' }
    : { synced: null, plain: text.trim() || null, source: 'Яндекс Музыка' }
}

async function lrclibLyrics(t: Track): Promise<Lyrics | null> {
  const query = {
    track_name: t.title,
    artist_name: t.artists[0] ?? '',
    album_name: t.album ?? '',
    duration: Math.round(t.durationMs / 1000),
  }
  const res = await $fetch<{ syncedLyrics?: string | null, plainLyrics?: string | null }>(`${LRCLIB}/get`, {
    query,
    headers: { 'User-Agent': UA },
    timeout: 8000,
  }).catch(() => null)
  if (!res) return null
  const synced = res.syncedLyrics ? parseLrc(res.syncedLyrics) : []
  if (synced.length) return { synced, plain: null, source: 'LRCLIB' }
  return res.plainLyrics ? { synced: null, plain: res.plainLyrics, source: 'LRCLIB' } : null
}

export async function findLyrics(event: H3Event, t: Track): Promise<Lyrics | null> {
  const conn = await listConnections(await requireUserId(event))
  if (conn.yandex) {
    try {
      const yid = t.source === 'yandex'
        ? t.sourceId
        : await findYandexMatch(event, { title: t.title, artists: t.artists, durationMs: t.durationMs })
      if (yid) {
        const y = await yandexLyrics(event, yid)
        if (y?.synced) return y
        // Есть только обычный текст — попробуем найти синхронизированный в LRCLIB.
        const l = await lrclibLyrics(t)
        return l?.synced ? l : y ?? l
      }
    }
    catch (e: any) {
      console.warn('[lyrics] yandex:', e?.statusCode ?? '', e?.message)
    }
  }
  return lrclibLyrics(t)
}
