import type { H3Event } from 'h3'

/**
 * Spotify Web API (Authorization Code flow, секрет хранится только на сервере).
 * Учтены изменения Dev Mode от февраля 2026: search limit ≤ 10, /playlists/{id}/items, /me/library.
 */

const ACCOUNTS = 'https://accounts.spotify.com'
const API = 'https://api.spotify.com/v1'

export const SPOTIFY_SCOPES = [
  'streaming', // Web Playback SDK (нужен Premium)
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-library-read',
  'user-library-modify',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-private', // экспорт плейлистов сайта в Spotify
  'playlist-modify-public',
  'user-top-read', // топ треков и исполнителей
  'user-read-recently-played', // недавно прослушанное
].join(' ')

function credentials(event: H3Event) {
  const { clientId, clientSecret } = useRuntimeConfig(event).spotify
  if (!clientId || !clientSecret) {
    throw createError({ statusCode: 500, message: 'NUXT_SPOTIFY_CLIENT_ID / NUXT_SPOTIFY_CLIENT_SECRET не заданы' })
  }
  return { clientId, clientSecret }
}

/**
 * Redirect URI строится от текущего адреса: локально это http://127.0.0.1:3000/...,
 * на Vercel — https://<домен>/... Оба адреса нужно добавить в настройках приложения Spotify.
 */
export function spotifyRedirectUri(event: H3Event) {
  return `${getRequestURL(event).origin}/api/auth/spotify/callback`
}

export function spotifyAuthorizeUrl(event: H3Event, state: string) {
  const params = new URLSearchParams({
    client_id: credentials(event).clientId,
    response_type: 'code',
    redirect_uri: spotifyRedirectUri(event),
    scope: SPOTIFY_SCOPES,
    state,
  })
  return `${ACCOUNTS}/authorize?${params}`
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
}

/** Разрешения, без которых не работают топ и недавнее — если их нет, просим переподключить. */
export const SPOTIFY_PERSONAL_SCOPES = ['user-top-read', 'user-read-recently-played']
export const hasSpotifyScopes = (scope: string | null | undefined) =>
  !!scope && SPOTIFY_PERSONAL_SCOPES.every(s => scope.split(' ').includes(s))

async function tokenRequest(event: H3Event, body: Record<string, string>) {
  const { clientId, clientSecret } = credentials(event)
  return $fetch<TokenResponse>(`${ACCOUNTS}/api/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  })
}

export async function spotifyExchangeCode(event: H3Event, code: string) {
  return tokenRequest(event, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: spotifyRedirectUri(event),
  })
}

/** Профиль Spotify по свежему токену — для входа/привязки аккаунта. */
export async function spotifyProfile(accessToken: string) {
  try {
    return await $fetch<{ id: string, display_name?: string, product?: string, images?: { url: string }[] }>(`${API}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  }
  catch (err: any) {
    // Development Mode: пользователь не добавлен в User Management приложения.
    if (err?.statusCode === 403) {
      throw createError({ statusCode: 403, message: 'Ваш аккаунт Spotify не добавлен в приложение. Войдите через Яндекс или попросите владельца добавить ваш email в Spotify Dashboard → User Management' })
    }
    throw err
  }
}

/** Актуальный access token текущего пользователя; обновляет его за минуту до истечения. */
export async function getSpotifyToken(event: H3Event) {
  const userId = await requireUserId(event)
  const acc = await getAccount(userId, 'spotify')
  // 409, а не 401: 401 на клиенте означает «сессия сайта истекла».
  if (!acc) throw createError({ statusCode: 409, message: 'Spotify не подключён' })
  if (acc.expiresAt && acc.expiresAt - Date.now() > 60_000) return { accessToken: acc.accessToken, expiresAt: acc.expiresAt }

  try {
    const t = await tokenRequest(event, { grant_type: 'refresh_token', refresh_token: acc.refreshToken ?? '' })
    const expiresAt = Date.now() + t.expires_in * 1000
    // Spotify не всегда присылает новый refresh_token — тогда остаётся старый.
    await updateAccountTokens(userId, 'spotify', { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt })
    return { accessToken: t.access_token, expiresAt }
  }
  catch (err: any) {
    if (err?.data?.error === 'invalid_grant') {
      throw createError({ statusCode: 409, message: 'Доступ к Spotify отозван — переподключите в настройках' })
    }
    throw err
  }
}

export async function spotifyFetch<T>(event: H3Event, path: string, opts: { method?: 'GET' | 'PUT' | 'POST' | 'DELETE', query?: Record<string, unknown>, body?: unknown } = {}): Promise<T> {
  const { accessToken } = await getSpotifyToken(event)
  return $fetch<T>(path, {
    baseURL: API,
    method: opts.method ?? 'GET',
    query: opts.query,
    body: opts.body as any,
    headers: { Authorization: `Bearer ${accessToken}` },
  }) as Promise<T>
}

// ---------- Модели ----------

interface SpImage { url: string, width: number | null }
interface SpAlbumRef { id: string, name: string, images?: SpImage[], release_date?: string }
interface SpTrack {
  id: string
  name: string
  duration_ms: number
  explicit?: boolean
  artists?: { id?: string, name: string }[]
  album?: SpAlbumRef
  is_playable?: boolean
}

/** Самая большая обложка (Spotify сортирует images от большей к меньшей): нужна для шапок и фона. */
const bestImage = (images?: SpImage[]) => images?.[0]?.url

export function spotifyToTrack(t: SpTrack, album?: SpAlbumRef): Track {
  const a = t.album ?? album
  return {
    uid: `spotify:${t.id}`,
    source: 'spotify',
    sourceId: t.id,
    title: t.name,
    artists: t.artists?.map(x => x.name) ?? [],
    artistIds: t.artists?.map(x => x.id ?? ''),
    album: a?.name,
    albumId: a?.id,
    coverUrl: bestImage(a?.images),
    durationMs: t.duration_ms,
    explicit: Boolean(t.explicit),
  }
}

export async function spotifySearch(event: H3Event, q: string, offset = 0): Promise<{ total: number, tracks: Track[] }> {
  const res = await spotifyFetch<{ tracks?: { items: SpTrack[], total: number } }>(event, '/search', {
    // limit максимум 10 для приложений в Development Mode (с февраля 2026)
    query: { q, type: 'track', limit: 10, offset, market: 'from_token' },
  })
  return {
    total: res.tracks?.total ?? 0,
    tracks: (res.tracks?.items ?? []).filter(t => t.is_playable !== false).map(t => spotifyToTrack(t)),
  }
}

interface SpAlbum extends SpAlbumRef {
  artists: { name: string }[]
  tracks: { items: SpTrack[] }
}

export async function spotifyAlbum(event: H3Event, id: string): Promise<Collection> {
  const a = await spotifyFetch<SpAlbum>(event, `/albums/${encodeURIComponent(id)}`, { query: { market: 'from_token' } })
  return {
    kind: 'album',
    id: `spotify:${a.id}`,
    title: a.name,
    subtitle: a.artists.map(x => x.name).join(', '),
    coverUrl: bestImage(a.images),
    year: a.release_date ? Number(a.release_date.slice(0, 4)) : undefined,
    tracks: a.tracks.items.filter(t => t.is_playable !== false).map(t => spotifyToTrack(t, a)),
  }
}

// ---------- Персональное из Spotify ----------

export async function spotifyTopTracks(event: H3Event, range: 'short_term' | 'medium_term' | 'long_term' = 'short_term'): Promise<Track[]> {
  const res = await spotifyFetch<{ items: SpTrack[] }>(event, '/me/top/tracks', { query: { time_range: range, limit: 30 } })
  return res.items.filter(t => t.is_playable !== false).map(t => spotifyToTrack(t))
}

export async function spotifyTopArtists(event: H3Event): Promise<SpotifyArtistInfo[]> {
  const res = await spotifyFetch<{ items: { id: string, name: string, images?: SpImage[] }[] }>(event, '/me/top/artists', { query: { time_range: 'medium_term', limit: 20 } })
  return res.items.map(a => ({ id: a.id, name: a.name, imageUrl: a.images?.at(-2)?.url ?? a.images?.[0]?.url }))
}

export async function spotifyRecentlyPlayed(event: H3Event): Promise<Track[]> {
  const res = await spotifyFetch<{ items: { track: SpTrack, played_at: string }[] }>(event, '/me/player/recently-played', { query: { limit: 30 } })
  const seen = new Set<string>()
  return res.items.flatMap(({ track }) => {
    if (!track || seen.has(track.id)) return []
    seen.add(track.id)
    return [spotifyToTrack(track)]
  })
}

export async function spotifyMyPlaylists(event: H3Event): Promise<SpotifyPlaylistInfo[]> {
  const [me, res] = await Promise.all([
    spotifyFetch<{ id: string }>(event, '/me'),
    spotifyFetch<{ items: any[] }>(event, '/me/playlists', { query: { limit: 50 } }),
  ])
  return res.items.filter(Boolean).map(p => ({
    id: `spotify:${p.id}`,
    title: p.name,
    coverUrl: p.images?.[0]?.url,
    // С февраля 2026 поле tracks переименовано в items
    count: p.items?.total ?? p.tracks?.total,
    owned: p.owner?.id === me.id || Boolean(p.collaborative),
  }))
}

/** Треки плейлиста Spotify (API отдаёт только свои плейлисты и совместные). */
export async function spotifyPlaylist(event: H3Event, id: string): Promise<Collection> {
  const meta = await spotifyFetch<any>(event, `/playlists/${encodeURIComponent(id)}`, { query: { fields: 'id,name,description,images,owner(display_name)' } })
  const tracks: Track[] = []
  for (let offset = 0; offset < 500; offset += 50) {
    const page = await spotifyFetch<{ items: any[], next: string | null }>(event, `/playlists/${encodeURIComponent(id)}/items`, { query: { limit: 50, offset, market: 'from_token' } })
    for (const it of page.items) {
      const t = it?.item ?? it?.track
      if (t?.type === 'track' && t.id && t.is_playable !== false) tracks.push(spotifyToTrack(t))
    }
    if (!page.next) break
  }
  return {
    kind: 'playlist',
    id: `spotify:${meta.id}`,
    title: meta.name,
    subtitle: meta.description || meta.owner?.display_name,
    coverUrl: meta.images?.[0]?.url,
    tracks,
  }
}

/** «Любимые треки» Spotify (до 500 последних). */
export async function spotifySavedTracks(event: H3Event): Promise<Collection> {
  const tracks: Track[] = []
  for (let offset = 0; offset < 500; offset += 50) {
    const page = await spotifyFetch<{ items: { track: SpTrack }[], next: string | null }>(event, '/me/tracks', { query: { limit: 50, offset, market: 'from_token' } })
    tracks.push(...page.items.map(i => i.track).filter(t => t && t.is_playable !== false).map(t => spotifyToTrack(t)))
    if (!page.next) break
  }
  return { kind: 'playlist', id: 'spotify:saved', title: 'Любимое в Spotify', tracks }
}

// ---------- Поиск по всему ----------

export async function spotifySearchAll(event: H3Event, q: string): Promise<SearchResult> {
  // limit максимум 10 для приложений в Development Mode (с февраля 2026)
  const res = await spotifyFetch<any>(event, '/search', { query: { q, type: 'track,album,artist', limit: 10, market: 'from_token' } })
  return {
    top: null,
    tracks: (res.tracks?.items ?? []).filter((t: SpTrack) => t && t.is_playable !== false).map((t: SpTrack) => spotifyToTrack(t)),
    albums: (res.albums?.items ?? []).filter(Boolean).map((a: any) => ({
      id: `spotify:${a.id}`,
      title: a.name,
      artists: (a.artists ?? []).map((x: any) => x.name),
      year: a.release_date ? Number(a.release_date.slice(0, 4)) : undefined,
      coverUrl: bestImage(a.images),
    })),
    artists: (res.artists?.items ?? []).filter(Boolean).map((a: any) => ({
      id: `spotify:${a.id}`,
      name: a.name,
      imageUrl: a.images?.at(-2)?.url ?? a.images?.[0]?.url,
    })),
  }
}

export async function spotifyArtistName(event: H3Event, id: string) {
  const a = await spotifyFetch<{ name: string }>(event, `/artists/${encodeURIComponent(id)}`)
  return a.name
}

// ---------- Spotify Connect: управление другими устройствами Spotify ----------

const WEB_PLAYER_NAME = 'Audio Web' // наш браузерный плеер — уже есть в списке как устройство сайта

function deviceKind(type: string): DeviceKind {
  const t = type.toLowerCase()
  if (t === 'smartphone') return 'phone'
  if (t === 'tablet') return 'tablet'
  if (t === 'tv' || t === 'stb' || t === 'castvideo') return 'tv'
  if (t === 'computer') return 'computer'
  return 'speaker'
}

export async function spotifyDevices(event: H3Event): Promise<DeviceInfo[]> {
  const res = await spotifyFetch<{ devices: { id: string | null, name: string, type: string, is_restricted: boolean }[] }>(event, '/me/player/devices')
  return res.devices
    .filter(d => d.id && !d.is_restricted && d.name !== WEB_PLAYER_NAME)
    .map(d => ({ id: `sp:${d.id}`, name: d.name, kind: deviceKind(d.type), lastSeen: Date.now(), state: null, spotify: true }))
}

/** Что сейчас играет в Spotify (на любом устройстве). */
export async function spotifyPlayerState(event: H3Event): Promise<(DeviceState & { deviceId: string | null }) | null> {
  const res = await spotifyFetch<any>(event, '/me/player', { query: { market: 'from_token' } }).catch(() => null)
  if (!res || !res.item || res.item.type !== 'track') return null
  return {
    track: spotifyToTrack(res.item),
    isPlaying: Boolean(res.is_playing),
    positionMs: res.progress_ms ?? 0,
    durationMs: res.item.duration_ms ?? 0,
    at: Date.now(),
    volume: (res.device?.volume_percent ?? 80) / 100,
    deviceId: res.device?.id ? `sp:${res.device.id}` : null,
  }
}

/** Ищет трек в Spotify (для треков Яндекса, отправляемых на устройство Spotify). */
export async function findSpotifyMatch(event: H3Event, t: Track): Promise<string | null> {
  if (t.source === 'spotify') return t.sourceId
  const q = `track:${normalize(t.title)} artist:${t.artists[0] ?? ''}`
  const { tracks } = await spotifySearch(event, q).catch(() => ({ tracks: [] as Track[] }))
  const want = normalize(t.title)
  const hit = tracks.find(x => normalize(x.title) === want && Math.abs(x.durationMs - t.durationMs) < 5000) ?? tracks.find(x => normalize(x.title) === want)
  return hit?.sourceId ?? null
}

/** Команда устройству Spotify Connect через Web API. */
export async function spotifyRemoteCommand(event: H3Event, deviceId: string, cmd: DeviceCommand) {
  const device_id = deviceId
  const call = (method: 'PUT' | 'POST', path: string, query: Record<string, unknown> = {}, body?: unknown) =>
    spotifyFetch(event, path, { method, query: { device_id, ...query }, body })

  switch (cmd.type) {
    case 'play-queue': {
      // Только то, что есть в Spotify: свои треки — как есть, остальные ищем (не больше 20, чтобы не ждать долго).
      const ids: string[] = []
      let offset = 0
      const slice = cmd.queue.slice(cmd.index, cmd.index + 100)
      for (const [k, t] of slice.entries()) {
        const id = t.source === 'spotify' ? t.sourceId : (k < 20 ? await findSpotifyMatch(event, t) : null)
        if (id) ids.push(id)
        else if (k === 0) offset = 0
      }
      if (!ids.length) throw createError({ statusCode: 404, message: 'Этих треков нет в Spotify' })
      return call('PUT', '/me/player/play', {}, { uris: ids.map(id => `spotify:track:${id}`), offset: { position: offset }, position_ms: cmd.positionMs })
    }
    case 'pause': return call('PUT', '/me/player/pause')
    case 'resume': return call('PUT', '/me/player/play')
    case 'next': return call('POST', '/me/player/next')
    case 'previous': return call('POST', '/me/player/previous')
    case 'seek': return call('PUT', '/me/player/seek', { position_ms: Math.round(cmd.ms) })
    case 'volume': return call('PUT', '/me/player/volume', { volume_percent: Math.round(cmd.value * 100) })
    case 'enqueue': {
      for (const t of cmd.tracks.slice(0, 20)) {
        const id = await findSpotifyMatch(event, t)
        if (id) await call('POST', '/me/player/queue', { uri: `spotify:track:${id}` })
      }
      return
    }
    default:
      throw createError({ statusCode: 400, message: 'Команда не поддерживается устройством Spotify' })
  }
}

/** Свои (и совместные) плейлисты Spotify — для импорта. Чужие API в Development Mode не отдаёт. */
export async function spotifyOwnPlaylists(event: H3Event): Promise<ExternalPlaylist[]> {
  const list = await spotifyMyPlaylists(event)
  return list.filter(p => p.owned).map(p => ({ id: p.id, source: 'spotify' as const, title: p.title, count: p.count, coverUrl: p.coverUrl }))
}

/** Есть ли у подключения права на создание плейлистов (выданы после добавления экспорта). */
export const canModifySpotifyPlaylists = (scope: string | null | undefined) => (scope ?? '').split(' ').includes('playlist-modify-private')

/**
 * Создаёт приватный плейлист в Spotify и добавляет треки (по 100 за запрос).
 * С февраля 2026: POST /me/playlists и POST /playlists/{id}/items.
 */
export async function spotifyCreatePlaylist(event: H3Event, name: string, trackIds: string[]) {
  const p = await spotifyFetch<{ id: string }>(event, '/me/playlists', {
    method: 'POST',
    body: { name, public: false, description: 'Экспорт из Audio' },
  })
  for (let k = 0; k < trackIds.length; k += 100) {
    await spotifyFetch(event, `/playlists/${p.id}/items`, {
      method: 'POST',
      body: { uris: trackIds.slice(k, k + 100).map(id => `spotify:track:${id}`) },
    })
  }
  return { id: `spotify:${p.id}` }
}
