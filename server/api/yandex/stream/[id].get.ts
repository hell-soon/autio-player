// Явные импорты — на всякий случай для самого важного маршрута (см. AGENTS.md: автоимпорт и `X as Type`)
import { withExplainedErrors } from '~~/server/utils/explain-error'
import { cached } from '~~/server/utils/cache'
import { requireUserId } from '~~/server/utils/users'
import { parseYandexQuality, yandexStreamUrl } from '~~/server/utils/yandex'

/** Готовая ссылка на поток живёт у Яндекса дольше — 90 с хватает, чтобы предзагрузка, игра и повтор не ходили в API заново */
const STREAM_URL_TTL_MS = 90_000

/**
 * Редирект на прямую ссылку CDN Яндекса.
 * Звук идёт из браузера напрямую с серверов Яндекса, не через Vercel.
 * <audio src="/api/yandex/stream/ID"> каждый раз получает свежую ссылку.
 */
export default withExplainedErrors('stream', async (event) => {
  const id = getRouterParam(event, 'id')!
  if (!/^\d+(:\d+)?$/.test(id)) throw createError({ statusCode: 400, statusMessage: 'Неверный id' })

  const quality = parseYandexQuality(getQuery(event).quality)
  const t0 = performance.now()
  const userId = await requireUserId(event)
  const t1 = performance.now()
  let fresh = false
  const stream = await cached(`u:${userId}:stream:${id}:${quality}`, STREAM_URL_TTL_MS, () => {
    fresh = true
    return yandexStreamUrl(event, id, quality)
  })
  const t2 = performance.now()

  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'X-Stream-Info', `${stream.method}; ${stream.codec}; ${stream.bitrate}`)
  // Видно в DevTools → Network → Timing: сколько заняли сессия и запрос к Яндексу (или ссылка из кэша)
  setHeader(event, 'Server-Timing', `auth;dur=${(t1 - t0).toFixed(1)}, yandex;dur=${(t2 - t1).toFixed(1)};desc="${fresh ? 'api' : 'cache'}"`)
  return sendRedirect(event, stream.url, 302)
})
