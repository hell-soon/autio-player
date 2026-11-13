import type { H3Event } from 'h3'

/**
 * «Вышло новое»: свежие релизы (за 90 дней) исполнителей, которых человек слушает и лайкает.
 * Источник — Яндекс: brief-info (lastReleases) + direct-albums. Формат неофициальный, разбор мягкий:
 * нет даты релиза — релиз не показываем (иначе всплывали бы альбомы годовой давности).
 */

const FRESH_MS = 90 * 86_400_000

function typeLabel(a: any) {
  if (a?.type === 'single') return 'Сингл'
  if ((a?.trackCount ?? 0) > 0 && a.trackCount <= 5) return 'EP'
  return 'Альбом'
}

export async function newReleases(event: H3Event, userId: string): Promise<ReleaseInfo[]> {
  if (!(await getAccount(userId, 'yandex'))) return []
  const taste = await tasteOf(userId, 180)
  const artists = taste.artists.slice(0, 15)
  const now = Date.now()

  const perArtist = await mapLimit(artists, 4, async (a) => {
    const id = await resolveYandexArtist(event, a)
    if (!id) return []
    const [brief, direct] = await Promise.all([
      ymGet<{ result: any }>(event, `/artists/${encodeURIComponent(id)}/brief-info`).catch(() => null),
      ymGet<{ result: any }>(event, `/artists/${encodeURIComponent(id)}/direct-albums`, { 'page': 0, 'page-size': 6, 'sort-by': 'year' }).catch(() => null),
    ])
    const albums: any[] = [...(brief?.result?.lastReleases ?? []), ...(direct?.result?.albums ?? [])]
    return albums.flatMap((al) => {
      const date = Date.parse(al?.releaseDate ?? '')
      if (!al?.id || !Number.isFinite(date) || now - date > FRESH_MS || date > now + 86_400_000) return []
      return [{
        id: `yandex:${al.id}`,
        title: al.title ?? '',
        artists: (al.artists ?? []).map((x: any) => x.name),
        year: al.year,
        coverUrl: coverUrl(al.coverUri, '400x400'),
        releaseDate: new Date(date).toISOString(),
        type: typeLabel(al),
      }]
    })
  })

  const seen = new Set<string>()
  return perArtist.flat()
    .filter(r => !seen.has(r.id) && seen.add(r.id))
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
    .slice(0, 12)
}
