import { and, asc, eq, gte } from 'drizzle-orm'

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const MONTHS_FULL = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']

/**
 * Статистика прослушиваний из истории сайта.
 * Время прослушивания — по длительности треков (точное время, сколько трек реально играл, не хранится).
 * tzOffsetMin — смещение часового пояса пользователя (для «по часам» и границ дней/месяцев).
 */
export async function listeningStats(userId: string, range: StatsRange, tzOffsetMin: number): Promise<ListeningStats> {
  const { history, tracks } = schema
  const shift = -tzOffsetMin * 60_000 // локальное время = UTC + shift
  const local = (ms: number) => new Date(ms + shift)
  const nowLocal = local(Date.now())

  let from = 0
  if (range === 'year') from = Date.UTC(nowLocal.getUTCFullYear(), 0, 1) - shift
  if (range === 'month') from = Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate() - 29) - shift

  const rows = await useDb()
    .select({ playedAt: history.playedAt, t: tracks })
    .from(history)
    .innerJoin(tracks, eq(history.trackUid, tracks.uid))
    .where(and(eq(history.userId, userId), gte(history.playedAt, from)))
    .orderBy(asc(history.playedAt))

  const byTrack = new Map<string, { track: Track, plays: number }>()
  const byArtist = new Map<string, { name: string, artistId?: string, source: TrackSource, coverUrl?: string, plays: number }>()
  const byHour = Array.from({ length: 24 }, () => 0)
  let ms = 0

  // Шкала: 12 месяцев (год — текущий год, всё время — последние 12) или 30 дней.
  const timeline: StatsBucket[] = []
  const keyOf = (d: Date) => (range === 'month' ? d.toISOString().slice(0, 10) : d.toISOString().slice(0, 7))
  const index = new Map<string, number>()
  if (range === 'month') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate() - i))
      index.set(keyOf(d), timeline.length)
      timeline.push({ label: String(d.getUTCDate()), full: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`, value: 0 })
    }
  }
  else {
    for (let i = 0; i < 12; i++) {
      const d = range === 'year'
        ? new Date(Date.UTC(nowLocal.getUTCFullYear(), i, 1))
        : new Date(Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth() - 11 + i, 1))
      index.set(keyOf(d), timeline.length)
      timeline.push({ label: MONTHS[d.getUTCMonth()]!, full: `${MONTHS_FULL[d.getUTCMonth()]} ${d.getUTCFullYear()}`, value: 0 })
    }
  }

  for (const r of rows) {
    const track = rowToTrack(r.t)
    ms += track.durationMs
    const t = byTrack.get(track.uid) ?? { track, plays: 0 }
    t.plays++
    byTrack.set(track.uid, t)

    track.artists.forEach((name, i) => {
      const k = name.toLowerCase()
      const a = byArtist.get(k) ?? { name, artistId: track.artistIds?.[i] || undefined, source: track.source, coverUrl: track.coverUrl, plays: 0 }
      a.plays++
      byArtist.set(k, a)
    })

    const d = local(r.playedAt)
    byHour[d.getUTCHours()]!++
    const bi = index.get(keyOf(d))
    if (bi !== undefined) timeline[bi]!.value++
  }

  const top = <T extends { plays: number }>(m: Map<string, T>, n: number) => [...m.values()].sort((a, b) => b.plays - a.plays).slice(0, n)

  return {
    range,
    plays: rows.length,
    minutes: Math.round(ms / 60_000),
    uniqueTracks: byTrack.size,
    uniqueArtists: byArtist.size,
    topTracks: top(byTrack, 10),
    topArtists: top(byArtist, 10),
    timeline,
    byHour: byHour.map((value, h) => ({ label: String(h), full: `${String(h).padStart(2, '0')}:00–${String(h).padStart(2, '0')}:59`, value })),
    firstPlayedAt: rows[0]?.playedAt ?? null,
  }
}
