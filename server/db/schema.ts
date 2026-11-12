import type { DeviceCommand, DeviceState } from '../../shared/types/connect'
import { bigint, boolean, index, integer, jsonb, pgTable, primaryKey, text, uniqueIndex } from 'drizzle-orm/pg-core'

/**
 * Несколько пользователей: у каждого своя библиотека и свои подключённые сервисы.
 * Треки — общий кэш метаданных (снимок), чтобы библиотека открывалась без запросов к Spotify/Яндексу.
 * Время везде — unix ms, проставляется кодом. В Postgres это bigint: в обычный integer миллисекунды не помещаются.
 */

/** unix ms */
const ms = (name: string) => bigint(name, { mode: 'number' })

export const users = pgTable('users', {
  id: text().primaryKey(),
  name: text().notNull(),
  avatarUrl: text('avatar_url'),
  role: text({ enum: ['owner', 'user'] }).notNull().default('user'),
  createdAt: ms('created_at').notNull(),
})

/** Подключённые сервисы. Токены хранятся зашифрованными (AES-GCM, ключ из NUXT_SESSION_PASSWORD). */
export const accounts = pgTable('accounts', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text({ enum: ['spotify', 'yandex', 'lastfm'] }).notNull(),
  providerUserId: text('provider_user_id').notNull(),
  displayName: text('display_name'),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: ms('expires_at'),
  /** Premium у Spotify / Плюс у Яндекса */
  premium: boolean().notNull().default(false),
  /** Выданные разрешения (Spotify) — чтобы знать, нужно ли переподключение */
  scope: text(),
  updatedAt: ms('updated_at').notNull(),
}, t => [
  uniqueIndex('accounts_provider_uid').on(t.provider, t.providerUserId),
  uniqueIndex('accounts_user_provider').on(t.userId, t.provider),
])

export const tracks = pgTable('tracks', {
  uid: text().primaryKey(), // "spotify:ID" | "yandex:ID:ALBUM"
  source: text({ enum: ['spotify', 'yandex'] }).notNull(),
  sourceId: text('source_id').notNull(),
  title: text().notNull(),
  artists: jsonb().$type<string[]>().notNull(),
  artistIds: jsonb('artist_ids').$type<string[]>(),
  album: text(),
  albumId: text('album_id'),
  coverUrl: text('cover_url'),
  durationMs: integer('duration_ms').notNull(),
  explicit: boolean().notNull().default(false),
  updatedAt: ms('updated_at').notNull(),
})

export const likes = pgTable('likes', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  trackUid: text('track_uid').notNull().references(() => tracks.uid, { onDelete: 'cascade' }),
  likedAt: ms('liked_at').notNull(),
}, t => [primaryKey({ columns: [t.userId, t.trackUid] })])

export const playlists = pgTable('playlists', {
  id: text().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  description: text(),
  createdAt: ms('created_at').notNull(),
  updatedAt: ms('updated_at').notNull(),
}, t => [index('playlists_user_idx').on(t.userId)])

export const playlistTracks = pgTable('playlist_tracks', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  playlistId: text('playlist_id').notNull().references(() => playlists.id, { onDelete: 'cascade' }),
  trackUid: text('track_uid').notNull().references(() => tracks.uid, { onDelete: 'cascade' }),
  position: integer().notNull(),
  addedAt: ms('added_at').notNull(),
}, t => [index('playlist_tracks_playlist_idx').on(t.playlistId, t.position)])

export const history = pgTable('history', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  trackUid: text('track_uid').notNull().references(() => tracks.uid, { onDelete: 'cascade' }),
  playedAt: ms('played_at').notNull(),
}, t => [index('history_user_played_idx').on(t.userId, t.playedAt)])

/** Устройства пользователя (каждый браузер/PWA) для «Подключения устройств»: кто онлайн и что играет. */
export const devices = pgTable('devices', {
  id: text().primaryKey(), // случайный id браузера (localStorage)
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  kind: text({ enum: ['computer', 'phone', 'tablet', 'speaker', 'tv'] }).notNull(),
  lastSeen: ms('last_seen').notNull(),
  state: jsonb().$type<DeviceState>(),
}, t => [index('devices_user_idx').on(t.userId, t.lastSeen)])

/** Команды для устройств (пауза, перенос воспроизведения…) — забираются при следующей синхронизации. */
export const deviceCommands = pgTable('device_commands', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  payload: jsonb().$type<DeviceCommand>().notNull(),
  createdAt: ms('created_at').notNull(),
}, t => [index('device_commands_device_idx').on(t.deviceId, t.id)])
