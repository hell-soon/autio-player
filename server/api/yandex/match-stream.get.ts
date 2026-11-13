// Явные импорты — на всякий случай для самого важного маршрута (см. AGENTS.md: автоимпорт и `X as Type`)
import { findYandexMatch } from '~~/server/utils/match'
import { withExplainedErrors } from '~~/server/utils/explain-error'
import { parseYandexQuality, yandexStreamUrl } from '~~/server/utils/yandex'

/**
 * Ищет трек в Яндексе и сразу редиректит на поток.
 * Один URL для <audio src> — клиенту не нужно ждать ответа перед play() (важно для iOS).
 */
export default withExplainedErrors('match-stream', async (event) => {
  const { title, artists, durationMs } = getQuery(event)
  if (!title) throw createError({ statusCode: 400, message: 'title обязателен' })

  const id = await findYandexMatch(event, {
    title: String(title),
    artists: String(artists ?? '').split('|').filter(Boolean),
    durationMs: Number(durationMs) || 0,
  })
  if (!id) throw createError({ statusCode: 404, message: 'Трек не найден в Яндекс Музыке' })

  const q = String(getQuery(event).quality ?? '')
  const stream = await yandexStreamUrl(event, id, parseYandexQuality(q))
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'X-Matched-Track', id)
  return sendRedirect(event, stream.url, 302)
})
