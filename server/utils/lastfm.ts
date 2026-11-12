import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'

/**
 * Last.fm: вход (web auth) и скробблинг.
 * Ключ и секрет приложения — NUXT_LASTFM_API_KEY / NUXT_LASTFM_SECRET (https://www.last.fm/api/account/create).
 * Подпись api_sig = md5(отсортированные пары ключ+значение + секрет), без format/callback.
 */
const API = 'https://ws.audioscrobbler.com/2.0/'

export function lastfmConfig(event?: H3Event) {
  const { apiKey, secret } = useRuntimeConfig(event).lastfm
  return { apiKey: String(apiKey || ''), secret: String(secret || ''), enabled: Boolean(apiKey && secret) }
}

function sign(params: Record<string, string>, secret: string) {
  const base = Object.keys(params).sort().map(k => `${k}${params[k]}`).join('')
  return createHash('md5').update(base + secret, 'utf8').digest('hex')
}

async function call<T>(event: H3Event, method: string, params: Record<string, string>, write = false): Promise<T> {
  const { apiKey, secret } = lastfmConfig(event)
  const all = { ...params, method, api_key: apiKey }
  const body = new URLSearchParams({ ...all, api_sig: sign(all, secret), format: 'json' })
  const res = await $fetch<any>(API, {
    method: write ? 'POST' : 'GET',
    ...(write ? { body: body.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } } : { query: Object.fromEntries(body) }),
    timeout: 10_000,
  })
  if (res?.error) throw createError({ statusCode: 502, message: `Last.fm: ${res.message}` })
  return res as T
}

export function lastfmAuthUrl(event: H3Event) {
  const { apiKey } = lastfmConfig(event)
  const cb = `${getRequestURL(event).origin}/api/auth/lastfm/callback`
  return `https://www.last.fm/api/auth/?api_key=${apiKey}&cb=${encodeURIComponent(cb)}`
}

export async function lastfmGetSession(event: H3Event, token: string) {
  const res = await call<{ session: { name: string, key: string } }>(event, 'auth.getSession', { token })
  return res.session
}

function trackParams(t: Track) {
  return {
    artist: t.artists[0] ?? '',
    track: t.title,
    ...(t.album ? { album: t.album } : {}),
    ...(t.durationMs ? { duration: String(Math.round(t.durationMs / 1000)) } : {}),
  }
}

export async function lastfmNowPlaying(event: H3Event, sk: string, t: Track) {
  await call(event, 'track.updateNowPlaying', { ...trackParams(t), sk }, true)
}

export async function lastfmScrobble(event: H3Event, sk: string, t: Track, startedAt: number) {
  await call(event, 'track.scrobble', { ...trackParams(t), timestamp: String(Math.floor(startedAt / 1000)), sk }, true)
}
