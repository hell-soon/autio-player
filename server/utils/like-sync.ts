import type { H3Event } from 'h3'

/**
 * Лайки в обе стороны:
 *  - лайк на сайте ставится и в сервисе трека (Spotify — «Любимые треки», Яндекс — «Мне нравится»);
 *  - импорт забирает лайки из обоих сервисов в библиотеку сайта.
 */

export async function syncLikeToService(event: H3Event, userId: string, t: Track, liked: boolean) {
  try {
    if (t.source === 'spotify' && await getAccount(userId, 'spotify')) {
      // С февраля 2026 — общий эндпоинт библиотеки, URI в query.
      await spotifyFetch(event, '/me/library', { method: liked ? 'PUT' : 'DELETE', query: { uris: `spotify:track:${t.sourceId}` } })
    }
    if (t.source === 'yandex') {
      const acc = await getAccount(userId, 'yandex')
      if (acc) {
        await ymPostForm(event, `/users/${acc.providerUserId}/likes/tracks/${liked ? 'add-multiple' : 'remove'}`, { 'track-ids': t.sourceId })
      }
    }
  }
  catch (e: any) {
    // Лайк на сайте уже сохранён — сбой синхронизации не должен его откатывать.
    console.warn('[like-sync]', t.uid, e?.statusCode ?? '', e?.message)
  }
}

interface Liked { track: Track, likedAt: number }

async function spotifyLikes(event: H3Event): Promise<Liked[]> {
  const out: Liked[] = []
  for (let offset = 0; offset < 1000; offset += 50) {
    const page = await spotifyFetch<{ items: { added_at: string, track: any }[], next: string | null }>(event, '/me/tracks', { query: { limit: 50, offset, market: 'from_token' } })
    for (const i of page.items) {
      if (i.track?.id) out.push({ track: spotifyToTrack(i.track), likedAt: Date.parse(i.added_at) || Date.now() })
    }
    if (!page.next) break
  }
  return out
}

async function yandexLikes(event: H3Event, uid: string): Promise<Liked[]> {
  const res = await ymGet<{ result: any }>(event, `/users/${uid}/likes/tracks`, { 'if-modified-since-revision': 0 })
  const items: { id: string | number, albumId?: string | number, timestamp?: string }[] = res.result?.library?.tracks ?? []
  const likedAt = new Map(items.map(i => [String(i.id), i.timestamp ? Date.parse(i.timestamp) : Date.now()]))
  const ids = items.slice(0, 1000).map(i => (i.albumId ? `${i.id}:${i.albumId}` : String(i.id)))

  const out: Liked[] = []
  for (let k = 0; k < ids.length; k += 100) {
    const batch = await ymPostForm<{ result: any[] }>(event, '/tracks', { 'track-ids': ids.slice(k, k + 100).join(','), 'with-positions': 'true' })
    for (const t of batch.result ?? []) {
      if (!t?.title || t.available === false) continue
      out.push({ track: toTrack(t), likedAt: likedAt.get(String(t.id)) ?? Date.now() })
    }
  }
  return out
}

/** Забрать лайки из подключённых сервисов в библиотеку сайта (уже лайкнутые не дублируются). */
export async function importLikes(event: H3Event, userId: string) {
  const conn = await activeConnections(userId)
  const result = { spotify: 0, yandex: 0, errors: [] as string[] }
  const sources: [keyof typeof result & ('spotify' | 'yandex'), () => Promise<Liked[]>][] = []
  if (conn.spotify) sources.push(['spotify', () => spotifyLikes(event)])
  if (conn.yandex) {
    const acc = await getAccount(userId, 'yandex')
    if (acc) sources.push(['yandex', () => yandexLikes(event, acc.providerUserId)])
  }

  for (const [name, load] of sources) {
    try {
      const list = await load()
      result[name] = await addLikes(userId, list)
    }
    catch (e: any) {
      console.warn(`[import] ${name}:`, e?.statusCode ?? '', e?.message)
      result.errors.push(name === 'spotify' ? 'Spotify' : 'Яндекс')
    }
  }
  return result
}
