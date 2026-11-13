/**
 * Маленькая копия обложки с нашего домена — чтобы браузер мог прочитать её пиксели
 * (цвет акцента из обложки). Только обложки Яндекса и Spotify: это не открытый прокси.
 */
const ALLOWED = [/^avatars\.yandex\.net$/, /^i\.scdn\.co$/, /^mosaic\.scdn\.co$/, /^[\w-]+\.spotifycdn\.com$/]
const MAX_BYTES = 1_500_000

export default defineEventHandler(async (event) => {
  let url: URL
  try {
    url = new URL(String(getQuery(event).url ?? ''))
  }
  catch {
    throw createError({ statusCode: 400, message: 'Неверная ссылка' })
  }
  if (url.protocol !== 'https:' || !ALLOWED.some(r => r.test(url.hostname))) {
    throw createError({ statusCode: 400, message: 'Источник обложки не разрешён' })
  }
  // У Яндекса размер — в конце пути: для цвета хватит 50×50
  if (url.hostname === 'avatars.yandex.net') url.pathname = url.pathname.replace(/\/\d+x\d+$/, '/50x50')

  const res = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(8000) }).catch(() => null)
  const type = res?.headers.get('content-type') ?? ''
  if (!res?.ok || !type.startsWith('image/')) throw createError({ statusCode: 502, message: 'Обложка недоступна' })
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > MAX_BYTES) throw createError({ statusCode: 413, message: 'Слишком большая обложка' })

  setHeaders(event, { 'content-type': type, 'cache-control': 'private, max-age=604800, immutable' })
  return buf
})
