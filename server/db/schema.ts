import type { DeviceCommand, DeviceState } from '../../shared/types/connect'
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * Несколько пользователей: у каждого своя библиотека и свои подключённые сервисы.
 * Треки — общий кэш метаданных (снимок), чтобы библиотека открывалась без запросов к Spotify/Яндексу.
 * Время везде — unix ms, проставляется кодом.
 */

export const users = sqliteTable('users', {
  id: text().primaryKey(),
  name: text().notNull(),
  avatarUrl: text('avatar_url'),
  role: text({ enum: ['owner', 'user'] }).notNull().default('user'),
  createdAt: integer('created_at').notNull(),
})

/** Подключённые сервисы. Токены хранятся зашифрованными (AES-GCM, ключ из NUXT_SESSION_PASSWORD). */
export const accounts = sqliteTable('accounts', {
  id: integer().primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text({ enum: ['spotify', 'yandex', 'lastfm'] }).notNull(),
  providerUserId: text('provider_user_id').notNull(),
  displayName: text('display_name'),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: integer('expires_at'),
  /** Premium у Spotify / Плюс у Яндекса */
  premium: integer({ mode: 'boolean' }).notNull().default(false),
  /** Выданные разрешения (Spotify) — чтобы знать, нужно ли переподключение */
  scope: text(),
  updatedAt: integer('updated_at').notNull(),
}, t => [
  uniqueIndex('accounts_provider_uid').on(t.provider, t.providerUserId),
  uniqueIndex('accounts_user_provider').on(t.userId, t.provider),
])

export const tracks = sqliteTable('tracks', {
  uid: text().primaryKey(), // "spotify:ID" | "yandex:ID:ALBUM"
  source: text({ enum: ['spotify', 'yandex'] }).notNull(),
  sourceId: text('source_id').notNull(),
  title: text().notNull(),
  artists: text({ mode: 'json' }).$type<string[]>().notNull(),
  artistIds: text('artist_ids', { mode: 'json' }).$type<string[]>(),
  album: text(),
  albumId: text('album_id'),
  coverUrl: text('cover_url'),
  durationMs: integer('duration_ms').notNull(),
  explicit: integer({ mode: 'boolean' }).notNull().default(false),
  updatedAt: integer('updated_at').notNull(),
})

export const likes = sqliteTable('likes', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  trackUid: text('track_uid').notNull().references(() => tracks.uid, { onDelete: 'cascade' }),
  likedAt: integer('liked_at').notNull(),
}, t => [primaryKey({ columns: [t.userId, t.trackUid] })])

export const playlists = sqliteTable('playlists', {
  id: text().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  description: text(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, t => [index('playlists_user_idx').on(t.userId)])

export const playlistTracks = sqliteTable('playlist_tracks', {
  id: integer().primaryKey({ autoIncrement: true }),
  playlistId: text('playlist_id').notNull().references(() => playlists.id, { onDelete: 'cascade' }),
  trackUid: text('track_uid').notNull().references(() => tracks.uid, { onDelete: 'cascade' }),
  position: integer().notNull(),
  addedAt: integer('added_at').notNull(),
}, t => [index('playlist_tracks_playlist_idx').on(t.playlistId, t.position)])

export const history = sqliteTable('history', {
  id: integer().primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  trackUid: text('track_uid').notNull().references(() => tracks.uid, { onDelete: 'cascade' }),
  playedAt: integer('played_at').notNull(),
}, t => [index('history_user_played_idx').on(t.userId, t.playedAt)])

/** Устройства пользователя (каждый браузер/PWA) для «Подключения устройств»: кто онлайн и что играет. */
export const devices = sqliteTable('devices', {
  id: text().primaryKey(), // случайный id браузера (localStorage)
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  kind: text({ enum: ['computer', 'phone', 'tablet', 'speaker', 'tv'] }).notNull(),
  lastSeen: integer('last_seen').notNull(),
  state: text({ mode: 'json' }).$type<DeviceState>(),
}, t => [index('devices_user_idx').on(t.userId, t.lastSeen)])

/** Команды для устройств (пауза, перенос воспроизведения…) — забираются при следующей синхронизации. */
export const deviceCommands = sqliteTable('device_commands', {
  id: integer().primaryKey({ autoIncrement: true }),
  deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  payload: text({ mode: 'json' }).$type<DeviceCommand>().notNull(),
  createdAt: integer('created_at').notNull(),
}, t => [index('device_commands_device_idx').on(t.deviceId, t.id)])
