import { and, desc, eq, gt, isNull, ne } from 'drizzle-orm'

/**
 * Друзья: все пользователи сайта (они и так приглашены владельцем).
 * Что видно другу — по умолчанию всё; приватность пользователя:
 *  - hideNowPlaying — не показывать, что сейчас играет (и «Слушать вместе» недоступно);
 *  - privateHistory — не показывать историю и топ исполнителей.
 * Плейлисты и число любимых видны всегда.
 */

const { users, devices, shares } = schema

/** Что сейчас играет у пользователя: самое свежее онлайн-устройство с треком. */
async function nowPlayingOf(userId: string): Promise<FriendNowPlaying | null> {
  const now = Date.now()
  const rows = await useDb().select({ state: devices.state, lastSeen: devices.lastSeen }).from(devices)
    .where(and(eq(devices.userId, userId), gt(devices.lastSeen, now - DEVICE_ONLINE_MS)))
  const best = rows
    .filter(r => r.state?.track)
    // Играющее важнее стоящего на паузе, затем — самое свежее
    .sort((a, b) => Number(b.state!.isPlaying) - Number(a.state!.isPlaying) || b.state!.at - a.state!.at)[0]
  if (!best?.state?.track) return null
  const s = best.state
  return { track: s.track!, isPlaying: s.isPlaying, positionMs: s.positionMs, at: s.at, serverNow: now }
}

async function lastSeenOf(userId: string) {
  const [row] = await useDb().select({ lastSeen: devices.lastSeen }).from(devices)
    .where(eq(devices.userId, userId)).orderBy(desc(devices.lastSeen)).limit(1)
  return row?.lastSeen ?? null
}

/** Друг (не сам пользователь) или 404 */
async function friendOrThrow(meId: string, friendId: string) {
  if (friendId === meId) throw createError({ statusCode: 404, message: 'Это вы' })
  const u = await useDb().query.users.findFirst({ where: eq(users.id, friendId) })
  if (!u) throw createError({ statusCode: 404, message: 'Друг не найден' })
  return u
}

export async function listFriends(meId: string): Promise<FriendInfo[]> {
  const list = await useDb().select().from(users).where(ne(users.id, meId))
  const out = await Promise.all(list.map(async u => ({
    id: u.id,
    name: u.name,
    avatarUrl: u.avatarUrl ?? undefined,
    nowPlaying: u.hideNowPlaying ? null : await nowPlayingOf(u.id),
    lastSeen: await lastSeenOf(u.id),
  })))
  // Сначала те, у кого что-то играет, потом — кто был недавно
  return out.sort((a, b) => Number(!!b.nowPlaying?.isPlaying) - Number(!!a.nowPlaying?.isPlaying) || (b.lastSeen ?? 0) - (a.lastSeen ?? 0))
}

export async function friendNowPlaying(meId: string, friendId: string) {
  const u = await friendOrThrow(meId, friendId)
  return u.hideNowPlaying ? null : nowPlayingOf(u.id)
}

export async function friendProfile(meId: string, friendId: string): Promise<FriendProfile> {
  const u = await friendOrThrow(meId, friendId)
  const [nowPlaying, lastSeen, lists, likedIds] = await Promise.all([
    u.hideNowPlaying ? null : nowPlayingOf(u.id),
    lastSeenOf(u.id),
    listPlaylists(u.id),
    getLikedIds(u.id),
  ])
  let recent: Track[] = []
  let topArtists: FriendProfile['topArtists'] = []
  if (!u.privateHistory) {
    const [r, stats] = await Promise.all([recentTracks(u.id, 20), listeningStats(u.id, 'month', -180)])
    recent = r
    topArtists = stats.topArtists.slice(0, 8)
  }
  return {
    id: u.id,
    name: u.name,
    avatarUrl: u.avatarUrl ?? undefined,
    nowPlaying,
    lastSeen,
    historyHidden: u.privateHistory,
    recent,
    topArtists,
    playlists: lists.filter(p => p.count > 0).map(p => ({ id: p.id, name: p.name, count: p.count, covers: p.covers })),
    likedCount: likedIds.length,
  }
}

/** Плейлист друга (только чтение) */
export async function friendPlaylist(meId: string, friendId: string, playlistId: string): Promise<Collection> {
  const u = await friendOrThrow(meId, friendId)
  const c = await getPlaylist(u.id, playlistId)
  return { ...c, id: `friend:${u.id}:${playlistId}`, subtitle: `Плейлист · ${u.name}` }
}

/** Любимые треки друга (только чтение) */
export async function friendLikes(meId: string, friendId: string): Promise<Collection> {
  const u = await friendOrThrow(meId, friendId)
  const list = await getLikedTracks(u.id)
  return { kind: 'playlist', id: `friend-liked:${u.id}`, title: `Любимое · ${u.name}`, tracks: list.slice(0, 500) }
}

// ---------- «Отправить другу» ----------

export async function shareTrack(meId: string, friendId: string, track: Track, note?: string) {
  await friendOrThrow(meId, friendId)
  await useDb().insert(shares).values({
    fromUserId: meId,
    toUserId: friendId,
    track,
    note: note?.trim().slice(0, 200) || null,
    createdAt: Date.now(),
  })
}

export async function incomingShares(meId: string): Promise<ShareInfo[]> {
  const rows = await useDb()
    .select({ s: shares, name: users.name, avatarUrl: users.avatarUrl })
    .from(shares)
    .innerJoin(users, eq(shares.fromUserId, users.id))
    .where(eq(shares.toUserId, meId))
    .orderBy(desc(shares.createdAt))
    .limit(30)
  return rows.map(r => ({
    id: r.s.id,
    from: { id: r.s.fromUserId, name: r.name, avatarUrl: r.avatarUrl ?? undefined },
    track: r.s.track,
    note: r.s.note ?? undefined,
    createdAt: r.s.createdAt,
    seen: r.s.seenAt !== null,
  }))
}

export async function markSharesSeen(meId: string) {
  await useDb().update(shares).set({ seenAt: Date.now() }).where(and(eq(shares.toUserId, meId), isNull(shares.seenAt)))
}

export async function unseenSharesCount(meId: string) {
  const rows = await useDb().select({ id: shares.id }).from(shares).where(and(eq(shares.toUserId, meId), isNull(shares.seenAt))).limit(99)
  return rows.length
}

// ---------- Совпадение вкусов ----------

const DAY_MS = 86_400_000

/** Вес исполнителей: лайк — 2, прослушивание за 90 дней — 1 (историю не берём, если она скрыта). */
async function artistWeights(userId: string, useHistory: boolean) {
  const { history, tracks } = schema
  const weights = new Map<string, { name: string, w: number }>()
  const trackSet = new Map<string, Track>()
  const add = (t: Track, w: number) => {
    t.artists.forEach((name, i) => {
      const key = normalize(name)
      if (!key) return
      const a = weights.get(key) ?? { name, w: 0 }
      a.w += i === 0 ? w : w / 3
      weights.set(key, a)
    })
  }
  for (const t of await getLikedTracks(userId)) {
    add(t, 2)
    trackSet.set(t.uid, t)
  }
  if (useHistory) {
    const rows = await useDb().select({ t: tracks }).from(history)
      .innerJoin(tracks, eq(history.trackUid, tracks.uid))
      .where(and(eq(history.userId, userId), gt(history.playedAt, Date.now() - 90 * DAY_MS)))
      .limit(5000)
    for (const r of rows) {
      const t = rowToTrack(r.t)
      add(t, 1)
      trackSet.set(t.uid, t)
    }
  }
  return { weights, tracks: trackSet }
}

/**
 * Совпадение вкусов в процентах: косинусная близость «профилей» по исполнителям
 * (у кого какие исполнители и насколько любимы). Корень делает шкалу человечнее:
 * у людей с парой общих любимых исполнителей выходит не 4%, а ~20%.
 */
export async function tasteMatch(meId: string, friendId: string): Promise<TasteMatch> {
  const friend = await friendOrThrow(meId, friendId)
  const [me, them] = await Promise.all([artistWeights(meId, true), artistWeights(friend.id, !friend.privateHistory)])

  let dot = 0
  let a2 = 0
  let b2 = 0
  for (const [, v] of me.weights) a2 += v.w * v.w
  for (const [, v] of them.weights) b2 += v.w * v.w
  const common: { name: string, score: number }[] = []
  for (const [k, v] of me.weights) {
    const o = them.weights.get(k)
    if (!o) continue
    dot += v.w * o.w
    common.push({ name: v.name, score: Math.min(v.w, o.w) })
  }
  const cos = a2 && b2 ? dot / Math.sqrt(a2 * b2) : 0
  const commonTracks = [...me.tracks.values()].filter(t => them.tracks.has(t.uid))

  return {
    percent: Math.round(Math.sqrt(cos) * 100),
    commonArtists: common.sort((x, y) => y.score - x.score).slice(0, 10).map(c => c.name),
    commonTrackCount: commonTracks.length,
    enoughData: me.weights.size >= 3 && them.weights.size >= 3,
  }
}

/** «Общее у нас»: треки, которые есть у обоих (лайки и прослушивания) */
export async function commonTracks(meId: string, friendId: string): Promise<Collection> {
  const friend = await friendOrThrow(meId, friendId)
  const [me, them] = await Promise.all([artistWeights(meId, true), artistWeights(friend.id, !friend.privateHistory)])
  const list = [...me.tracks.values()].filter(t => them.tracks.has(t.uid))
  return { kind: 'playlist', id: `taste:${friend.id}`, title: 'Общее у нас', subtitle: `Вы и ${friend.name}`, tracks: list.slice(0, 300) }
}
