import type { H3Event } from 'h3'

/**
 * Персональные подборки Яндекса. Формат ответов неофициальный и меняется —
 * всё разбирается «мягко»: если что-то не распознано, блок просто не показывается.
 */

// Тип подборки → понятная подпись (если API не вернул описание).
const PERSONAL = {
  daily: 'Обновляется каждый день',
  neverHeard: 'Новое для вас',
  recentTracks: 'Свежие релизы по вашему вкусу',
  missedLikes: 'То, что вы давно не слушали',
} as const

function playlistCover(p: any): string | undefined {
  const uri = p?.cover?.uri ?? p?.cover?.itemsUri?.[0] ?? p?.ogImage ?? p?.animatedCoverUri
  return uri ? coverUrl(uri, '400x400') : undefined
}

function toPlaylistInfo(p: any, kind?: string): PlaylistInfo | null {
  const uid = p?.uid ?? p?.owner?.uid
  if (!uid || p?.kind === undefined) return null
  return {
    id: `yandex:${uid}:${p.kind}`,
    title: p.title ?? 'Плейлист',
    description: p.description || (kind ? PERSONAL[kind as keyof typeof PERSONAL] : undefined),
    coverUrl: playlistCover(p),
    kind,
  }
}

export async function yandexPersonalPlaylists(event: H3Event): Promise<PlaylistInfo[]> {
  const kinds = Object.keys(PERSONAL)
  const results = await Promise.allSettled(kinds.map(k => ymGet<{ result: any }>(event, `/playlists/personal/${k}`)))
  return results.flatMap((r, i) => {
    if (r.status !== 'fulfilled') return []
    const data = r.value.result?.data ?? r.value.result
    const info = toPlaylistInfo(data, kinds[i])
    return info ? [info] : []
  })
}

/** Плейлист Яндекса с треками (персональные тоже лежат как обычные плейлисты пользователя). */
export async function yandexPlaylist(event: H3Event, uid: string, kind: string): Promise<Collection> {
  const res = await ymGet<{ result: any }>(event, `/users/${encodeURIComponent(uid)}/playlists/${encodeURIComponent(kind)}`)
  const p = res.result ?? {}
  const items: any[] = p.tracks ?? []
  const tracks = items.map(i => i?.track ?? i).filter(t => t?.title && t.available !== false).map(toTrack)
  return {
    kind: 'playlist',
    id: `yandex:${uid}:${kind}`,
    title: p.title ?? 'Плейлист',
    subtitle: p.description || undefined,
    coverUrl: playlistCover(p),
    tracks,
  }
}

export async function yandexStations(event: H3Event): Promise<StationInfo[]> {
  const res = await ymGet<{ result: any }>(event, '/rotor/stations/dashboard')
  const list: any[] = res.result?.stations ?? []
  return list.flatMap((s) => {
    const st = s?.station ?? s
    const id = st?.id
    if (!id?.type || !id?.tag || !st?.name) return []
    // «Моя волна» уже есть отдельной карточкой.
    if (id.type === 'user') return []
    return [{
      id: `${id.type}:${id.tag}`,
      name: st.name,
      color: st.icon?.backgroundColor,
      iconUrl: st.icon?.imageUrl ? coverUrl(st.icon.imageUrl, '100x100') : undefined,
    }]
  }).slice(0, 16)
}

export async function yandexChart(event: H3Event): Promise<Track[]> {
  const res = await ymGet<{ result: any }>(event, '/landing3/chart')
  const items: any[] = res.result?.chart?.tracks ?? []
  return items.map(i => i?.track ?? i).filter(t => t?.title && t.available !== false).map(toTrack).slice(0, 30)
}

/** Настройки «Моей волны»: настроение и характер подбора. */
export async function yandexWaveSettings(event: H3Event, moodEnergy: string, diversity: string) {
  await ymPost(event, '/rotor/station/user:onyourwave/settings3', { moodEnergy, diversity, language: 'any', type: 'rotor' })
}

/** id исполнителя в Яндексе по имени (для станции «по исполнителю» из топа Spotify). */
export async function yandexFindArtistId(event: H3Event, name: string): Promise<string | null> {
  const res = await ymGet<{ result: any }>(event, '/search', { text: name, type: 'artist', page: 0 })
  const first = res.result?.artists?.results?.[0]
  return first?.id ? String(first.id) : null
}

// ---------- Поиск по всему и исполнители ----------

const yAlbum = (a: any): AlbumInfo => ({
  id: `yandex:${a.id}`,
  title: a.title ?? '',
  artists: (a.artists ?? []).map((x: any) => x.name),
  year: a.year,
  coverUrl: coverUrl(a.coverUri, '400x400'),
})

const yArtist = (a: any): ArtistInfo => ({
  id: `yandex:${a.id}`,
  name: a.name,
  imageUrl: coverUrl(a.cover?.uri ?? a.ogImage, '400x400'),
})

export async function yandexSearchAll(event: H3Event, text: string): Promise<SearchResult> {
  const res = await ymGet<{ result: any }>(event, '/search', { text, type: 'all', page: 0, nocorrect: 'False' })
  const r = res.result ?? {}
  const tracks = (r.tracks?.results ?? []).filter((t: any) => t.available !== false).map(toTrack)
  const albums = (r.albums?.results ?? []).map(yAlbum)
  const artists = (r.artists?.results ?? []).map(yArtist)

  let top: SearchTop | null = null
  const best = r.best
  if (best?.type === 'artist' && best.result) top = { kind: 'artist', artist: yArtist(best.result) }
  else if (best?.type === 'album' && best.result) top = { kind: 'album', album: yAlbum(best.result) }
  else if (best?.type === 'track' && best.result) top = { kind: 'track', track: toTrack(best.result) }
  return { top, tracks, albums, artists }
}

export async function yandexArtist(event: H3Event, id: string): Promise<ArtistPage> {
  const res = await ymGet<{ result: any }>(event, `/artists/${encodeURIComponent(id)}/brief-info`)
  const r = res.result ?? {}
  return {
    artist: yArtist(r.artist ?? { id, name: '' }),
    tracks: (r.popularTracks ?? []).filter((t: any) => t.available !== false).map(toTrack),
    albums: [...(r.albums ?? []), ...(r.alsoAlbums ?? [])].map(yAlbum),
    similar: (r.similarArtists ?? []).map(yArtist).slice(0, 12),
  }
}
