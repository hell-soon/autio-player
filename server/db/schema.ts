import type { DeviceCommand, DeviceQueue, DeviceState } from '../../shared/types/connect'
import type { Track } from '../../shared/types/track'
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
  /** Какими сервисами пользуется: интерфейс прячет лишнее. null — оба (пользователи до появления настройки) */
  services: text({ enum: ['yandex', 'spotify', 'both'] }),
  /** Прошёл приветствие «Чем вы пользуетесь?» (у существующих пользователей — да) */
  onboarded: boolean().notNull().default(true),
  /** Приватность для друзей: не показывать, что сейчас играет */
  hideNowPlaying: boolean('hide_now_playing').notNull().default(false),
  /** Приватность для друзей: не показывать историю и топ исполнителей */
  privateHistory: boolean('private_history').notNull().default(false),
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
  /** Последняя синхронизация лайков с сервисом (для двусторонней синхронизации) */
  likesSyncedAt: ms('likes_synced_at'),
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
  /** Очередь на момент последней синхронизации — чтобы продолжить с того же места (в т.ч. на другом устройстве) */
  queue: jsonb().$type<DeviceQueue>(),
}, t => [index('devices_user_idx').on(t.userId, t.lastSeen)])

/** Команды для устройств (пауза, перенос воспроизведения…) — забираются при следующей синхронизации. */
export const deviceCommands = pgTable('device_commands', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  payload: jsonb().$type<DeviceCommand>().notNull(),
  createdAt: ms('created_at').notNull(),
}, t => [index('device_commands_device_idx').on(t.deviceId, t.id)])

/**
 * Собранные подборки («Микс дня», «Открытия недели»). Хранятся в базе, а не в памяти инстанса,
 * чтобы на всех устройствах был один и тот же набор до следующего периода.
 */
export const mixes = pgTable('mixes', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: text({ enum: ['daily', 'discover'] }).notNull(),
  /** Период, на который собран микс: "2026-11-13" (день) или "2026-W46" (неделя) */
  period: text().notNull(),
  tracks: jsonb().$type<Track[]>().notNull(),
  createdAt: ms('created_at').notNull(),
}, t => [primaryKey({ columns: [t.userId, t.kind] })])

/** «Вам прислали»: трек, отправленный другом прямо на сайте. */
export const shares = pgTable('shares', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  fromUserId: text('from_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  toUserId: text('to_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  track: jsonb().$type<Track>().notNull(),
  note: text(),
  createdAt: ms('created_at').notNull(),
  seenAt: ms('seen_at'),
}, t => [index('shares_to_idx').on(t.toUserId, t.createdAt)])
