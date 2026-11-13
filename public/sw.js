/*
 * Service worker приложения (PWA).
 *  - статика сборки (/_nuxt/, шрифты, иконки) — из кэша: имена файлов содержат хэш, они не меняются;
 *  - страницы — из сети, а без сети — последняя сохранённая версия или экран «Нет соединения»;
 *  - API, аудио и /_nuxt/builds/ (номер последней сборки — для автообновления) не трогаем: всегда свежие.
 */
const VERSION = 'v2'
const STATIC = `static-${VERSION}`
const PAGES = `pages-${VERSION}`

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
