import { createHash, createHmac } from 'node:crypto'
import type { H3Event } from 'h3'

/**
 * Клиент неофициального API Яндекс Музыки (тот же, что у мобильных/десктопных клиентов).
 * Константы сверены с github.com/MarshalX/yandex-music-api (main, ноябрь 2026).
 * API может измениться без предупреждения — все обращения собраны здесь.
 */

const BASE_URL = 'https://api.music.yandex.net'
const ANDROID_CLIENT = 'YandexMusicAndroid/24023621'
// Подпись get-file-info валидна только в паре с этим заголовком клиента.
const DESKTOP_CLIENT = 'YandexMusicDesktopAppWindows/5.95.0'
const DESKTOP_SIGN_KEY = 'kzqU4XhfCaY6B6JTHODeq5'
const LEGACY_SIGN_SALT = 'XGRlBW9FXlekgbPrRHuSiA'

// Только кодеки, которые надёжно играет <audio> во всех браузерах, включая iOS Safari.
const BROWSER_CODECS = ['aac-mp4', 'he-aac-mp4', 'aac', 'he-aac', 'mp3']

/** lq — экономия трафика, nq — обычное, hq — высокое (по умолчанию) */
export type YandexQuality = 'lq' | 'nq' | 'hq' | 'lossless'
export const YANDEX_QUALITIES: YandexQuality[] = ['lq', 'nq', 'hq']
/** Качество из запроса (?quality=) — иначе 'hq'. Проверка функцией: автоимпорт не видит имя перед `as` */
export const parseYandexQuality = (q: unknown): YandexQuality => (YANDEX_QUALITIES.find(x => x === q) ?? 'hq')

// Публичные OAuth-данные официального Android-приложения Яндекс Музыки: только токен
// этого клиента даёт доступ к API Музыки (своё OAuth-приложение такой доступ не получит).
const OAUTH = 'https://oauth.yandex.ru'
const MUSIC_CLIENT_ID = '23cabbbdc6cd418abb4b39c32c41195d'
const MUSIC_CLIENT_SECRET = '53bc75238f0c4d08a118e51fe9203300'

interface YandexTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
}

function oauthPost<T>(path: string, body: Record<string, string>) {
  return $fetch<T>(`${OAUTH}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
    timeout: 10_000,
  })
}

/** Шаг 1 входа «по коду»: пользователь вводит user_code на странице verification_url. */
export function yandexRequestDeviceCode() {
  return oauthPost<{ device_code: string, user_code: string, verification_url: string, interval: number, expires_in: number }>(
    '/device/code',
    { client_id: MUSIC_CLIENT_ID, device_id: crypto.randomUUID().replace(/-/g, '').slice(0, 16), device_name: 'Audio Web' },
  )
}

/** Шаг 2: опрос. null — пользователь ещё не подтвердил. */
export async function yandexPollDeviceToken(deviceCode: string): Promise<YandexTokenResponse | null> {
  try {
    return await oauthPost<YandexTokenResponse>('/token', {
      grant_type: 'device_code',
      code: deviceCode,
      client_id: MUSIC_CLIENT_ID,
      client_secret: MUSIC_CLIENT_SECRET,
    })
  }
  catch (err: any) {
    const code = err?.data?.error
    if (code === 'authorization_pending' || code === 'slow_down') return null
    if (code === 'expired_token' || code === 'invalid_grant' || code === 'bad_verification_code') {
      throw createError({ statusCode: 410, message: 'Код устарел — начните вход заново' })
    }
    throw err
  }
}

function yandexRefresh(refreshToken: string) {
  return oauthPost<YandexTokenResponse>('/token', {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: MUSIC_CLIENT_ID,
    client_secret: MUSIC_CLIENT_SECRET,
  })
}

/** Профиль Яндекса по токену (для входа). */
export async function yandexProfile(accessToken: string) {
  const res = await $fetch<{ result: any }>(`${BASE_URL}/account/status`, {
    headers: { 'Authorization': `OAuth ${accessToken}`, 'X-Yandex-Music-Client': ANDROID_CLIENT },
    timeout: 10_000,
  })
  const a = res.result?.account ?? {}
  if (!a.uid) throw createError({ statusCode: 502, message: 'Яндекс не вернул профиль' })
  return {
    uid: String(a.uid),
    name: (a.displayName || a.fullName || a.login || 'Слушатель') as string,
    hasPlus: Boolean(res.result?.plus?.hasPlus),
  }
}

/** Токен Яндекс Музыки текущего пользователя (с обновлением по refresh_token). */
async function getToken(event: H3Event) {
  if (event.context.yandexToken) return event.context.yandexToken as string
  const userId = await requireUserId(event)
  const acc = await getAccount(userId, 'yandex')
  // 409, а не 401: 401 на клиенте означает «сессия сайта истекла».
  if (!acc) throw createError({ statusCode: 409, message: 'Яндекс Музыка не подключена — подключите в настройках' })

  let token = acc.accessToken
  if (acc.expiresAt && acc.expiresAt - Date.now() < 24 * 3600_000 && acc.refreshToken) {
    try {
      const t = await yandexRefresh(acc.refreshToken)
      token = t.access_token
      await updateAccountTokens(userId, 'yandex', {
        accessToken: t.access_token,
        refreshToken: t.refresh_token,
        expiresAt: t.expires_in ? Date.now() + t.expires_in * 1000 : null,
      })
    }
    catch (e) {
      console.warn('[yandex] не удалось обновить токен:', (e as Error).message)
    }
  }
  event.context.yandexToken = token
  return token
}

async function ymFetch<T>(event: H3Event, path: string, opts: { query?: Record<string, unknown>, client?: string, method?: 'GET' | 'POST', body?: unknown, form?: Record<string, string> } = {}): Promise<T> {
  const token = await getToken(event)
  return $fetch<T>(path, {
    baseURL: BASE_URL,
    method: opts.form ? 'POST' : opts.method ?? 'GET',
    query: opts.query,
    // Часть методов Яндекса принимает только form-urlencoded (лайки, пакетная загрузка треков).
    body: opts.form ? new URLSearchParams(opts.form).toString() : opts.body as any,
    timeout: 15_000,
    headers: {
      'Authorization': `OAuth ${token}`,
      'X-Yandex-Music-Client': opts.client ?? ANDROID_CLIENT,
      'Accept-Language': 'ru',
      ...(opts.form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
  }) as Promise<T>
}

// ---------- Модели ответа (только нужные поля) ----------

interface YmArtist { id?: number | string, name: string }
interface YmAlbum { id: number, title?: string, year?: number, coverUri?: string, artists?: YmArtist[] }
interface YmTrack {
  id: number | string
  title: string
  version?: string
  artists?: YmArtist[]
  albums?: YmAlbum[]
  coverUri?: string
  durationMs?: number
  available?: boolean
  contentWarning?: string
}

export function coverUrl(uri: string | undefined, size = '600x600') {
  return uri ? `https://${uri.replace('%%', size)}` : undefined
}

export function toTrack(t: YmTrack): Track {
  const albumId = t.albums?.[0]?.id
  const sourceId = albumId ? `${t.id}:${albumId}` : String(t.id)
  return {
    uid: `yandex:${sourceId}`,
    source: 'yandex',
    sourceId,
    title: t.version ? `${t.title} (${t.version})` : t.title,
    artists: t.artists?.map(a => a.name) ?? [],
    artistIds: t.artists?.map(a => String(a.id ?? '')),
    album: t.albums?.[0]?.title,
    albumId: albumId ? String(albumId) : undefined,
    coverUrl: coverUrl(t.coverUri),
    durationMs: t.durationMs ?? 0,
    explicit: t.contentWarning === 'explicit',
  }
}

// ---------- Методы ----------

export async function yandexSearch(event: H3Event, text: string, page = 0) {
  const res = await ymFetch<{ result: { tracks?: { results: YmTrack[], total: number } } }>(event, '/search', {
    query: { text, type: 'track', page, nocorrect: 'False' },
  })
  const tracks = res.result.tracks
  return {
    total: tracks?.total ?? 0,
    tracks: (tracks?.results ?? []).filter(t => t.available !== false).map(toTrack),
  }
}

export async function yandexAccountStatus(event: H3Event) {
  const res = await ymFetch<{ result: any }>(event, '/account/status')
  return {
    login: res.result?.account?.login as string | undefined,
    region: res.result?.account?.region as number | undefined,
    hasPlus: Boolean(res.result?.plus?.hasPlus),
  }
}

interface FileInfoResponse {
  result: { downloadInfo: { url: string, urls?: string[], codec: string, bitrate: number, quality: string, transport: string } }
}

/** Новый способ (get-file-info). transport=raw — незашифрованный поток. */
async function streamViaFileInfo(event: H3Event, trackId: string, quality: YandexQuality) {
  const ts = Math.floor(Date.now() / 1000)
  const transport = 'raw'
  const message = `${ts}${trackId}${quality}${BROWSER_CODECS.join('')}${transport}`
  // base64 c отрезанным последним символом ('=' паддинга у 32-байтного дайджеста)
  const sign = createHmac('sha256', DESKTOP_SIGN_KEY).update(message).digest('base64').slice(0, -1)

  const res = await ymFetch<FileInfoResponse>(event, '/get-file-info', {
    client: DESKTOP_CLIENT,
    query: { ts, trackId, quality, codecs: BROWSER_CODECS.join(','), transports: transport, sign },
  })
  const info = res.result.downloadInfo
  return { url: info.url, codec: info.codec, bitrate: info.bitrate, method: 'file-info' as const }
}

/** Старый способ (download-info + XML + md5). Оставлен как запасной. */
async function streamViaDownloadInfo(event: H3Event, trackId: string, quality: YandexQuality) {
  const res = await ymFetch<{ result: { codec: string, bitrateInKbps: number, downloadInfoUrl: string }[] }>(
    event, `/tracks/${trackId}/download-info`,
  )
  // Экономия — самый низкий битрейт, иначе — самый высокий
  const mp3 = res.result.filter(i => i.codec === 'mp3').sort((a, b) => b.bitrateInKbps - a.bitrateInKbps)
  const best = quality === 'lq' ? mp3.at(-1) : quality === 'nq' ? (mp3.find(i => i.bitrateInKbps <= 192) ?? mp3.at(-1)) : mp3[0]
  if (!best) throw createError({ statusCode: 502, message: 'Нет mp3 в download-info' })

  const xml = await $fetch<string>(best.downloadInfoUrl, { responseType: 'text', timeout: 10_000 })
  const tag = (name: string) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1] ?? ''
  const host = tag('host'), path = tag('path'), ts = tag('ts'), s = tag('s')
  const sign = createHash('md5').update(LEGACY_SIGN_SALT + path.slice(1) + s).digest('hex')
  return {
    url: `https://${host}/get-mp3/${sign}/${ts}${path}`,
    codec: 'mp3',
    bitrate: best.bitrateInKbps,
    method: 'download-info' as const,
  }
}

/** Возвращает прямую ссылку на поток. Ссылка живёт недолго — запрашивать прямо перед проигрыванием. */
export async function yandexStreamUrl(event: H3Event, trackId: string, quality: YandexQuality = 'hq') {
  try {
    return await streamViaFileInfo(event, trackId, quality)
  }
  catch (err) {
    console.warn('[yandex] get-file-info не сработал, пробую download-info:', (err as Error).message)
    return await streamViaDownloadInfo(event, trackId, quality)
  }
}

export async function yandexAlbum(event: H3Event, id: string): Promise<Collection> {
  const res = await ymFetch<{ result: YmAlbum & { volumes?: YmTrack[][] } }>(event, `/albums/${encodeURIComponent(id)}/with-tracks`)
  const a = res.result
  return {
    kind: 'album',
    id: `yandex:${a.id}`,
    title: a.title ?? '',
    subtitle: a.artists?.map(x => x.name).join(', '),
    coverUrl: coverUrl(a.coverUri),
    year: a.year,
    tracks: (a.volumes ?? []).flat().filter(t => t.available !== false).map(toTrack),
  }
}

// ---------- Радио (rotor): подбор музыки ----------

/**
 * Треки радиостанции Яндекса.
 *  - "user:onyourwave" — «Моя волна» (персональные рекомендации аккаунта);
 *  - "track:ID" — похожее на трек (используется для автопродолжения очереди).
 * queue — id последнего трека, чтобы станция продолжила с него, а не начала заново.
 */
export async function yandexStationTracks(event: H3Event, station: string, queueTrackId?: string): Promise<Track[]> {
  const res = await ymFetch<{ result: { sequence?: { track: YmTrack }[] } }>(event, `/rotor/station/${station}/tracks`, {
    query: { 'settings2': 'true', ...(queueTrackId ? { queue: queueTrackId } : {}) },
  })
  return (res.result.sequence ?? []).map(s => s.track).filter(t => t && t.available !== false).map(toTrack)
}

/** Обёртки для модулей подборок (yandex-feed.ts). */
export function ymGet<T>(event: H3Event, path: string, query?: Record<string, unknown>) {
  return ymFetch<T>(event, path, { query })
}
export function ymPost<T>(event: H3Event, path: string, body: unknown) {
  return ymFetch<T>(event, path, { method: 'POST', body })
}
export function ymPostForm<T>(event: H3Event, path: string, form: Record<string, string>) {
  return ymFetch<T>(event, path, { form })
}
