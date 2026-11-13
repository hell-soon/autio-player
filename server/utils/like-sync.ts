import { and, eq, inArray } from 'drizzle-orm'
import type { H3Event } from 'h3'

/**
 * Лайки в обе стороны (как «Любимые треки» в Spotify — одно и то же везде):
 *  - лайк/снятие на сайте сразу уходит в сервис трека (syncLikeToService);
 *  - syncLikes сверяет сайт с сервисом:
 *      новое в сервисе (лайкнули в приложении Яндекса)            → появляется на сайте;
 *      было на сайте до прошлой сверки, а в сервисе уже нет       → лайк сняли в приложении — снимаем и на сайте;
 *      новое на сайте, а в сервисе нет (не дошло)                 → досылаем в сервис.
 * Сверка не чаще раза в 5 минут на сервис (кнопка в библиотеке — принудительно).
 */

const SYNC_EVERY_MS = 5 * 60_000
const MAX_PUSH = 100

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

/** Лайки в сервисе: ключ сравнения → время лайка. complete=false — список обрезан (снимать лайки по нему нельзя). */
interface RemoteLikes {
  likedAt: Map<string, number>
  /** Догрузить треки по ключам (для новых лайков) */
  load: (keys: string[]) => Promise<Track[]>
  complete: boolean
}

/** Ключ сравнения: у Яндекса один трек бывает в разных альбомах — сравниваем по id трека. */
const keyOf = (t: { source: TrackSource, sourceId: string }) => (t.source === 'yandex' ? t.sourceId.split(':')[0]! : t.sourceId)

async function yandexRemote(event: H3Event, uid: string): Promise<RemoteLikes> {
  const res = await ymGet<{ result: any }>(event, `/users/${uid}/likes/tracks`, { 'if-modified-since-revision': 0 })
  const items: { id: string | number, albumId?: string | number, timestamp?: string }[] = res.result?.library?.tracks ?? []
  const likedAt = new Map<string, number>()
  const fullId = new Map<string, string>()
  for (const i of items) {
    likedAt.set(String(i.id), i.timestamp ? Date.parse(i.timestamp) || Date.now() : Date.now())
    fullId.set(String(i.id), i.albumId ? `${i.id}:${i.albumId}` : String(i.id))
  }
  return {
    likedAt,
    complete: true,
    load: keys => yandexTracksByIds(event, keys.slice(0, 1000).map(k => fullId.get(k) ?? k)),
  }
}

async function spotifyRemote(event: H3Event): Promise<RemoteLikes> {
  const likedAt = new Map<string, number>()
  const tracks = new Map<string, Track>()
  let complete = true
  for (let offset = 0; ; offset += 50) {
    if (offset >= 1000) {
      complete = false
      break
    }
    const page = await spotifyFetch<{ items: { added_at: string, track: any }[], next: string | null }>(event, '/me/tracks', { query: { limit: 50, offset, market: 'from_token' } })
    for (const i of page.items) {
      if (!i.track?.id) continue
      likedAt.set(i.track.id, Date.parse(i.added_at) || Date.now())
      tracks.set(i.track.id, spotifyToTrack(i.track))
    }
    if (!page.next) break
  }
  return { likedAt, complete, load: async keys => keys.map(k => tracks.get(k)).filter((t): t is Track => !!t) }
}

export async function syncLikes(event: H3Event, userId: string, force = false): Promise<LikesSyncResult> {
  const conn = await activeConnections(userId)
  const result: LikesSyncResult = { added: 0, removed: 0, pushed: 0, errors: [] }
  const db = useDb()
  const { likes, tracks, accounts } = schema

  for (const provider of ['yandex', 'spotify'] as const) {
    if (!conn[provider]) continue
    const acc = await getAccount(userId, provider)
    if (!acc) continue
    if (!force && acc.likesSyncedAt && Date.now() - acc.likesSyncedAt < SYNC_EVERY_MS) continue

    try {
      const startedAt = Date.now()
      const remote = provider === 'yandex' ? await yandexRemote(event, acc.providerUserId) : await spotifyRemote(event)

      // Лайки сайта из этого сервиса
      const rows = await db.select({ t: tracks, likedAt: likes.likedAt }).from(likes)
        .innerJoin(tracks, eq(likes.trackUid, tracks.uid))
        .where(and(eq(likes.userId, userId), eq(tracks.source, provider)))
      const local = rows.map(r => ({ track: rowToTrack(r.t), likedAt: r.likedAt, key: keyOf(r.t) }))
      const localKeys = new Set(local.map(l => l.key))

      // 1. Новое в сервисе → на сайт
      const missing = [...remote.likedAt.keys()].filter(k => !localKeys.has(k))
      if (missing.length) {
        const loaded = await remote.load(missing)
        result.added += await addLikes(userId, loaded.map(t => ({ track: t, likedAt: remote.likedAt.get(keyOf(t)) ?? startedAt })))
      }

      const absent = local.filter(l => !remote.likedAt.has(l.key))
      const last = acc.likesSyncedAt
      // 2. Сняли лайк в сервисе → снимаем на сайте (только то, что уже было при прошлой сверке)
      const toRemove = last && remote.complete ? absent.filter(l => l.likedAt < last) : []
      if (toRemove.length) {
        await db.delete(likes).where(and(eq(likes.userId, userId), inArray(likes.trackUid, toRemove.map(l => l.track.uid))))
        result.removed += toRemove.length
      }
      // 3. Новое на сайте, которого нет в сервисе → досылаем
      const toPush = absent.filter(l => !last || l.likedAt >= last).slice(0, MAX_PUSH)
      for (const l of toPush) await syncLikeToService(event, userId, l.track, true)
      result.pushed += toPush.length

      await db.update(accounts).set({ likesSyncedAt: startedAt }).where(and(eq(accounts.userId, userId), eq(accounts.provider, provider)))
    }
    catch (e: any) {
      console.warn(`[like-sync] ${provider}:`, e?.statusCode ?? '', e?.message)
      result.errors.push(provider === 'spotify' ? 'Spotify' : 'Яндекс')
    }
  }
  if (result.added || result.removed) invalidateUserCache(userId)
  return result
}
