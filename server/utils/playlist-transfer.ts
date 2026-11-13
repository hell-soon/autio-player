import type { H3Event } from 'h3'

/**
 * Перенос плейлистов между сервисами и сайтом:
 *  - импорт: свои плейлисты Spotify и Яндекса → плейлисты библиотеки сайта (треки как есть, без поиска);
 *  - экспорт: плейлист сайта → новый плейлист в Spotify или Яндексе. Треки другого сервиса
 *    ищутся по названию/исполнителю/длительности; ненайденные возвращаются списком.
 */

const MAX_TRACKS = 500

/** Плейлисты подключённых сервисов, доступные для импорта. Сбой одного сервиса не мешает другому. */
export async function listImportablePlaylists(event: H3Event, userId: string) {
  const conn = await activeConnections(userId)
  const errors: string[] = []
  const lists = await Promise.all([
    conn.spotify
      ? spotifyOwnPlaylists(event).catch((e) => {
        console.warn('[transfer] spotify list:', e?.statusCode ?? '', e?.message)
        errors.push('Spotify')
        return []
      })
      : [],
    conn.yandex
      ? getAccount(userId, 'yandex').then(acc => (acc ? yandexUserPlaylists(event, acc.providerUserId) : [])).catch((e) => {
        console.warn('[transfer] yandex list:', e?.statusCode ?? '', e?.message)
        errors.push('Яндекс')
        return []
      })
      : [],
  ])
  return { playlists: lists.flat() as ExternalPlaylist[], errors, connected: Boolean(conn.spotify || conn.yandex) }
}

/** Треки плейлиста по id: "spotify:ID" | "spotify:saved" | "yandex:UID:KIND" | "mix:daily" | "mix:discover". */
export async function loadExternalPlaylist(event: H3Event, id: string): Promise<Collection> {
  const [source, ...rest] = id.split(':')
  if (id === 'spotify:saved') return spotifySavedTracks(event)
  if (id === 'yandex:liked') {
    const acc = await getAccount(await requireUserId(event), 'yandex')
    if (!acc) throw createError({ statusCode: 409, message: 'Яндекс Музыка не подключена' })
    return yandexLikedCollection(event, acc.providerUserId)
  }
  if (source === 'mix' && (rest[0] === 'daily' || rest[0] === 'discover')) return getMix(event, await requireUserId(event), rest[0])
  if (source === 'spotify' && rest[0]) return spotifyPlaylist(event, rest[0])
  if (source === 'yandex' && rest.length === 2) return yandexPlaylist(event, rest[0]!, rest[1]!)
  throw createError({ statusCode: 400, message: 'Неверный id плейлиста' })
}

/** Создаёт плейлист сайта сразу со всеми треками (один INSERT вместо добавления по одному). */
export async function createPlaylistWithTracks(userId: string, name: string, list: Track[]) {
  const seen = new Set<string>()
  const unique = list.filter(t => !seen.has(t.uid) && seen.add(t.uid)).slice(0, MAX_TRACKS)
  const p = await createPlaylist(userId, name)
  if (unique.length) {
    await upsertTracks(unique)
    const now = Date.now()
    await useDb().insert(schema.playlistTracks).values(unique.map((t, i) => ({ playlistId: p.id, trackUid: t.uid, position: i, addedAt: now })))
  }
  return { id: p.id, name, count: unique.length }
}

export async function importPlaylists(event: H3Event, userId: string, ids: string[]): Promise<ImportPlaylistsResult> {
  const result: ImportPlaylistsResult = { imported: [], errors: [] }
  // По очереди: у Spotify и Яндекса лимиты частоты запросов.
  for (const id of ids.slice(0, 50)) {
    try {
      const c = await loadExternalPlaylist(event, id)
      if (!c.tracks.length) throw createError({ statusCode: 400, message: 'Пустой плейлист' })
      // Микс меняется каждый день/неделю — в название сохранённой копии добавляем дату
      const name = id.startsWith('mix:') ? `${c.title} · ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' })}` : c.title
      result.imported.push(await createPlaylistWithTracks(userId, name, c.tracks))
    }
    catch (e: any) {
      console.warn('[transfer] import', id, e?.statusCode ?? '', e?.message)
      result.errors.push(id)
    }
  }
  return result
}

export async function exportPlaylist(event: H3Event, userId: string, playlistId: string, to: TrackSource): Promise<ExportPlaylistResult> {
  const playlist = await getPlaylist(userId, playlistId)
  const list = playlist.tracks.slice(0, MAX_TRACKS)
  if (!list.length) throw createError({ statusCode: 400, message: 'В плейлисте нет треков' })

  const acc = await getAccount(userId, to)
  if (!acc) throw createError({ statusCode: 409, message: to === 'spotify' ? 'Spotify не подключён' : 'Яндекс Музыка не подключена' })
  if (to === 'spotify' && !canModifySpotifyPlaylists(acc.scope)) {
    throw createError({ statusCode: 409, message: 'Нужно переподключить Spotify в настройках — появилось разрешение на создание плейлистов' })
  }

  // id трека в целевом сервисе: свой — как есть, чужой — ищем.
  const ids = await mapLimit(list, 4, async (t) => {
    if (t.source === to) return t.sourceId
    try {
      return to === 'spotify'
        ? await findSpotifyMatch(event, t)
        : await findYandexMatch(event, { title: t.title, artists: t.artists, durationMs: t.durationMs })
    }
    catch {
      return null
    }
  })

  const found = ids.filter((x): x is string => !!x)
  const missing = list.filter((_, i) => !ids[i]).map(t => ({ title: t.title, artists: t.artists }))
  if (!found.length) throw createError({ statusCode: 404, message: 'Ни один трек не нашёлся в целевом сервисе' })

  const created = to === 'spotify'
    ? await spotifyCreatePlaylist(event, playlist.title, [...new Set(found)])
    : await yandexCreatePlaylist(event, acc.providerUserId, playlist.title, [...new Set(found)])
  invalidateUserCache(userId)
  return { id: created.id, added: new Set(found).size, missing }
}
