/*
 * Service worker приложения (PWA).
 *  - статика сборки (/_nuxt/, шрифты, иконки) — из кэша: имена файлов содержат хэш, они не меняются;
 *  - страницы — из сети, а без сети — последняя сохранённая версия или экран «Нет соединения»;
 *  - API, аудио и /_nuxt/builds/ (номер последней сборки — для автообновления) не трогаем: всегда свежие.
 */
const VERSION = 'v3'
const STATIC = `static-${VERSION}`
const PAGES = `pages-${VERSION}`
const AUDIO = `audio-${VERSION}`
/** Сколько треков держим в кэше (следующие в очереди + только что сыгранные) */
const MAX_AUDIO = 5
const MAX_AUDIO_BYTES = 30 * 1024 * 1024
const isStream = path => path.startsWith('/api/yandex/stream/') || path.startsWith('/api/yandex/match-stream')

/*
 * Кэш следующих треков (на случай метро и плохой связи).
 * Страница присылает адреса следующих треков → скачиваем целиком в Cache Storage → <audio> получает их отсюда
 * (с поддержкой Range: без 206-ответов Safari не играет). Звук лежит на CDN Яндекса: прочитать его можно,
 * только если CDN разрешает CORS — иначе кэш тихо выключается до перезапуска SW, всё играет как раньше.
 * В обычные запросы вмешиваемся, только если трек точно в кэше или нет сети.
 */
const cachedAudio = new Set()
let audioUnsupported = false
const audioReady = caches.open(AUDIO).then(c => c.keys()).then(keys => keys.forEach(k => cachedAudio.add(k.url))).catch(() => {})

async function trimAudio(cache) {
  const keys = await cache.keys()
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_AUDIO))) {
    await cache.delete(k)
    cachedAudio.delete(k.url)
  }
}

async function prefetchAudio(urls) {
  await audioReady
  if (audioUnsupported) return
  const cache = await caches.open(AUDIO)
  for (const raw of urls.slice(0, 3)) {
    const key = new URL(raw, self.location.origin).href
    if (cachedAudio.has(key)) continue
    try {
      // Свой домен → 302 на CDN. mode: 'cors' — иначе тело не прочитать (и не положить в кэш как настоящий ответ)
      const res = await fetch(key, { credentials: 'same-origin', mode: 'cors' })
      if (!res.ok) continue
      const blob = await res.blob()
      if (!blob.size || blob.size > MAX_AUDIO_BYTES) continue
      await cache.put(key, new Response(blob, { headers: { 'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg' } }))
      cachedAudio.add(key)
      await trimAudio(cache)
    }
    catch {
      // CDN не разрешает CORS (или нет сети) — больше не пытаемся до перезапуска SW
      audioUnsupported = true
      return
    }
  }
}

/** Ответ из кэша с поддержкой Range (206) — так его принимают и Safari, и Chrome. */
async function serveAudio(req, hit) {
  const blob = await hit.blob()
  const size = blob.size
  const type = hit.headers.get('Content-Type') || 'audio/mpeg'
  const range = req.headers.get('Range')
  if (!range) {
    return new Response(blob, { status: 200, headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' } })
  }
  const m = /bytes=(\d*)-(\d*)/.exec(range) || []
  let start = m[1] ? Number(m[1]) : 0
  let end = m[2] ? Number(m[2]) : size - 1
  if (!m[1] && m[2]) {
    start = Math.max(0, size - Number(m[2]))
    end = size - 1
  }
  end = Math.min(end, size - 1)
  if (start > end || start >= size) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
  }
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' },
  })
}

self.addEventListener('message', (event) => {
  const data = event.data
  if (data?.type === 'prefetch-audio' && Array.isArray(data.urls)) event.waitUntil(prefetchAudio(data.urls))
  if (data?.type === 'clear-audio') event.waitUntil(caches.delete(AUDIO).then(() => cachedAudio.clear()))
})

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter(k => !k.endsWith(VERSION)).map(k => caches.delete(k)))
    await self.clients.claim()
  })())
})

const OFFLINE_HTML = `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Нет соединения · Audio</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0e0e12;color:#f1f0f5;font-family:system-ui,sans-serif;text-align:center">
<div><h1 style="font-size:22px">Нет соединения</h1><p style="opacity:.7">Проверьте интернет — Audio продолжит, как только сеть появится.</p>
<button onclick="location.reload()" style="margin-top:12px;padding:10px 18px;border:0;border-radius:999px;background:#b4a7ff;color:#15131f;font-weight:600">Обновить</button></div></body></html>`

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  // Поток трека: из кэша, если он там есть (или нет сети — тогда проверяем кэш в любом случае)
  if (isStream(url.pathname)) {
    if (!cachedAudio.has(url.href) && self.navigator.onLine) return
    event.respondWith((async () => {
      const hit = await caches.open(AUDIO).then(c => c.match(url.href))
      return hit ? serveAudio(req, hit) : fetch(req)
    })())
    return
  }
  if (url.pathname.startsWith('/api/')) return
  // Номер последней сборки — всегда из сети, иначе приложение не узнает об обновлении
  if (url.pathname.startsWith('/_nuxt/builds/')) return

  // Статика с хэшем в имени — cache first.
  if (url.pathname.startsWith('/_nuxt/') || url.pathname.startsWith('/icons/') || /\.(woff2?|png|svg|ico)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC)
      const hit = await cache.match(req)
      if (hit) return hit
      const res = await fetch(req)
      if (res.ok) cache.put(req, res.clone())
      return res
    })())
    return
  }

  // Страницы — network first, без сети — из кэша или экран «Нет соединения».
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(PAGES)
      try {
        const res = await fetch(req)
        if (res.ok && res.type === 'basic') cache.put(req, res.clone())
        return res
      }
      catch {
        return (await cache.match(req)) || (await cache.match('/')) || new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      }
    })())
  }
})
