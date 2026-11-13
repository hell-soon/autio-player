export type TrackSource = 'yandex' | 'spotify'

/** Какими сервисами пользуется человек: от этого зависит интерфейс и чем играть треки */
export type MusicServices = 'yandex' | 'spotify' | 'both'

/** Трек в едином формате, независимо от источника. */
export interface Track {
  /** Глобальный id вида `yandex:123:456` / `spotify:abc` */
  uid: string
  source: TrackSource
  /** id внутри источника (для Яндекса — `trackId:albumId`) */
  sourceId: string
  title: string
  artists: string[]
  /** id исполнителей в источнике (в том же порядке, что artists) — для ссылок на страницу исполнителя */
  artistIds?: string[]
  album?: string
  albumId?: string
  coverUrl?: string
  durationMs: number
  explicit?: boolean
}

/** Коллекция треков: альбом источника или плейлист библиотеки. */
export interface Collection {
  kind: 'album' | 'playlist' | 'liked'
  /** id для маршрута: "spotify:ID" / "yandex:ID" для альбомов, id плейлиста */
  id: string
  title: string
  subtitle?: string
  coverUrl?: string
  year?: number
  tracks: Track[]
}
