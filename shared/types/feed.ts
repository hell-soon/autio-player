/** Типы персональных подборок (общие для сервера и клиента). */

export interface StationInfo {
  /** "genre:rock", "mood:calm", "activity:workout" … */
  id: string
  name: string
  color?: string
  iconUrl?: string
}

export interface PlaylistInfo {
  /** "yandex:UID:KIND" */
  id: string
  title: string
  description?: string
  coverUrl?: string
  /** daily / neverHeard / missedLikes / recentTracks */
  kind?: string
}

export interface SpotifyArtistInfo {
  id: string
  name: string
  imageUrl?: string
}

export interface SpotifyPlaylistInfo {
  /** "spotify:ID" */
  id: string
  title: string
  coverUrl?: string
  count?: number
  owned: boolean
}

export interface HomeFeed {
  connections: { yandex: boolean, spotify: boolean }
  /** «Микс дня» и «Открытия недели» (собираются при первом открытии) */
  mixes: MixInfo[]
  personal: PlaylistInfo[]
  stations: StationInfo[]
  chart: Track[]
  recent: Track[]
  spotifyTop: Track[]
  spotifyArtists: SpotifyArtistInfo[]
  spotifyPlaylists: SpotifyPlaylistInfo[]
  /** Spotify подключён без прав на топ/недавнее — нужно переподключить */
  spotifyNeedsReconnect: boolean
}

export interface AlbumInfo {
  /** "yandex:ID" | "spotify:ID" */
  id: string
  title: string
  artists: string[]
  year?: number
  coverUrl?: string
}

export interface ArtistInfo {
  /** "yandex:ID" | "spotify:ID" */
  id: string
  name: string
  imageUrl?: string
}

export type SearchTop =
  | { kind: 'artist', artist: ArtistInfo }
  | { kind: 'album', album: AlbumInfo }
  | { kind: 'track', track: Track }

export interface SearchResult {
  top: SearchTop | null
  tracks: Track[]
  albums: AlbumInfo[]
  artists: ArtistInfo[]
}

export interface ArtistPage {
  artist: ArtistInfo
  tracks: Track[]
  albums: AlbumInfo[]
  similar: ArtistInfo[]
}

export interface LyricsLine {
  /** Время начала строки, мс */
  t: number
  text: string
}

export interface Lyrics {
  /** Синхронизированный текст (подсвечивается по ходу трека) */
  synced: LyricsLine[] | null
  /** Обычный текст без таймингов */
  plain: string | null
  source: string
}

export type StatsRange = 'month' | 'year' | 'all'

export interface StatsBucket {
  label: string
  /** Подпись для подсказки (полная дата/период) */
  full: string
  value: number
}

export interface ListeningStats {
  range: StatsRange
  plays: number
  minutes: number
  uniqueTracks: number
  uniqueArtists: number
  topTracks: { track: Track, plays: number }[]
  topArtists: { name: string, artistId?: string, source: TrackSource, coverUrl?: string, plays: number }[]
  /** Прослушивания по месяцам (год / всё время) или по дням (месяц) */
  timeline: StatsBucket[]
  byHour: StatsBucket[]
  firstPlayedAt: number | null
}

/** Плейлист в Spotify/Яндексе, который можно импортировать в библиотеку сайта. */
export interface ExternalPlaylist {
  /** "spotify:ID" | "yandex:UID:KIND" */
  id: string
  source: TrackSource
  title: string
  count?: number
  coverUrl?: string
}

export interface ImportPlaylistsResult {
  imported: { id: string, name: string, count: number }[]
  errors: string[]
}

export interface ExportPlaylistResult {
  /** "spotify:ID" | "yandex:UID:KIND" — открывается на /collection/:id */
  id: string
  added: number
  /** Треки, которых не нашлось в целевом сервисе */
  missing: { title: string, artists: string[] }[]
}

/** Собранные сайтом подборки: «Микс дня», «Открытия недели». */
export type MixKind = 'daily' | 'discover'

export interface MixInfo {
  kind: MixKind
  title: string
  description: string
  covers: string[]
  count: number
}

/** Найдено по строчке из текста песни. */
export interface LyricsSearchHit {
  track: Track
  /** Строка текста, в которой нашлось совпадение (если источник её отдал) */
  line?: string
}
