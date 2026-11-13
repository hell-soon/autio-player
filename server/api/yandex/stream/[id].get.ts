// Явные импорты — на всякий случай для самого важного маршрута (см. AGENTS.md: автоимпорт и `X as Type`)
import { withExplainedErrors } from '~~/server/utils/explain-error'
import { parseYandexQuality, yandexStreamUrl } from '~~/server/utils/yandex'

/**
 * Редирект на прямую ссылку CDN Яндекса.
 * Звук идёт из браузера напрямую с серверов Яндекса, не через Vercel.
 * <audio src="/api/yandex/stream/ID"> каждый раз получает свежую ссылку.
 */
export default withExplainedErrors('stream', async (event) => {
  const id = getRouterParam(event, 'id')!
  if (!/^\d+(:\d+)?$/.test(id)) throw createError({ statusCode: 400, statusMessage: 'Неверный id' })

  const quality = parseYandexQuality(getQuery(event).quality)
  const stream = await yandexStreamUrl(event, id, quality)

  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'X-Stream-Info', `${stream.method}; ${stream.codec}; ${stream.bitrate}`)
  return sendRedirect(event, stream.url, 302)
})
