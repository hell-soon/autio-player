import { and, desc, eq, gte } from 'drizzle-orm'

/**
 * Умные плейлисты: собираются из истории и лайков по правилам, обновляются сами при каждом открытии.
 * Один запрос истории (90 дней) + лайки — дальше всё считается в памяти.
 */

const DAY = 86_400_000

export const SMART_KINDS = ['liked-month', 'top', 'forgotten', 'not-liked', 'new-week'] as const
export type SmartKind = typeof SMART_KINDS[number]
/** Проверка вместо `(SMART_KINDS as …).includes(…)`: автоимпорт Nitro не видит имя перед `as` */
export const isSmartKind = (k: unknown): k is SmartKind => typeof k === 'string' && SMART_KINDS.some(x => x === k)

const META: Record<SmartKind, { title: string, description: string }> = {
  'liked-month': { title: 'Новое в любимых', description: 'Что вы лайкнули за последний месяц' },
  'top': { title: 'Самое частое', description: 'Больше всего прослушиваний за 3 месяца' },
  'forgotten': { title: 'Давно не звучало', description: 'Любимое, что не играло больше двух месяцев' },
  'not-liked': { title: 'Слушаете, но не в любимых', description: 'Играло 3 раза и больше — может, пора ♥' },
  'new-week': { title: 'Открыто на этой неделе', description: 'Треки, которые впервые заиграли за 7 дней' },
}

interface Data {
  liked: { track: Track, likedAt: number }[]
  /** uid → прослушивания за 90 дней */
  plays: Map<string, { track: Track, n: number, first: number, last: number }>
  /** uid → последнее прослушивание за год (для «давно не звучало») */
  lastEver: Map<string, number>
  /** uid → самое первое прослушивание за год (для «открыто на этой неделе») */
  firstEver: Map<string, number>
}

async function load(userId: string): Promise<Data> {
  const { history, tracks, likes } = schema
  const db = useDb()
  const now = Date.now()
  const [hist, liked] = await Promise.all([
    db.select({ t: tracks, playedAt: history.playedAt }).from(history)
      .innerJoin(tracks, eq(history.trackUid, tracks.uid))
      .where(and(eq(history.userId, userId), gte(history.playedAt, now - 365 * DAY)))
      .orderBy(desc(history.playedAt))
      .limit(20_000),
    db.select({ t: tracks, likedAt: likes.likedAt }).from(likes)
      .innerJoin(tracks, eq(likes.trackUid, tracks.uid))
      .where(eq(likes.userId, userId))
      .orderBy(desc(likes.likedAt)),
  ])
  const plays: Data['plays'] = new Map()
  const lastEver = new Map<string, number>()
  const firstEver = new Map<string, number>()
  for (const r of hist) {
    // История идёт от новых к старым: первое попадание — последнее прослушивание, последнее — первое
    if (!lastEver.has(r.t.uid)) lastEver.set(r.t.uid, r.playedAt)
    firstEver.set(r.t.uid, r.playedAt)
    if (now - r.playedAt > 90 * DAY) continue
    const p = plays.get(r.t.uid) ?? { track: rowToTrack(r.t), n: 0, first: r.playedAt, last: r.playedAt }
    p.n++
    p.first = Math.min(p.first, r.playedAt)
    p.last = Math.max(p.last, r.playedAt)
    plays.set(r.t.uid, p)
  }
  return { liked: liked.map(r => ({ track: rowToTrack(r.t), likedAt: r.likedAt })), plays, lastEver, firstEver }
}

function build(kind: SmartKind, d: Data): Track[] {
  const now = Date.now()
  const likedSet = new Set(d.liked.map(l => l.track.uid))
  switch (kind) {
    case 'liked-month':
      return d.liked.filter(l => now - l.likedAt <= 30 * DAY).map(l => l.track)
    case 'top':
      return [...d.plays.values()].filter(p => p.n >= 2).sort((a, b) => b.n - a.n).slice(0, 50).map(p => p.track)
    case 'forgotten':
      // Лайкнуто давно (больше 2 месяцев) и с тех пор не играло 2 месяца
      return d.liked
        .filter(l => now - l.likedAt > 60 * DAY && now - (d.lastEver.get(l.track.uid) ?? 0) > 60 * DAY)
        .slice(0, 100)
        .map(l => l.track)
    case 'not-liked':
      return [...d.plays.values()].filter(p => p.n >= 3 && !likedSet.has(p.track.uid)).sort((a, b) => b.n - a.n).slice(0, 50).map(p => p.track)
    case 'new-week':
      // Впервые за год заиграло на этой неделе
      return [...d.plays.values()]
        .filter(p => now - (d.firstEver.get(p.track.uid) ?? 0) <= 7 * DAY)
        .sort((a, b) => b.first - a.first)
        .slice(0, 100)
        .map(p => p.track)
  }
}

export async function smartPlaylist(userId: string, kind: SmartKind): Promise<Collection> {
  const tracks = build(kind, await load(userId))
  return { kind: 'playlist', id: `smart:${kind}`, title: META[kind].title, subtitle: META[kind].description, tracks }
}

/** Карточки для библиотеки: название, сколько треков, обложки для коллажа. Пустые не показываем. */
export async function smartPlaylistCards(userId: string): Promise<SmartPlaylistInfo[]> {
  const d = await load(userId)
  return SMART_KINDS.map((kind) => {
    const list = build(kind, d)
    return {
      kind,
      ...META[kind],
      count: list.length,
      covers: [...new Set(list.map(t => t.coverUrl).filter(Boolean) as string[])].slice(0, 4),
    }
  }).filter(c => c.count > 0)
}
