/**
 * Понятная причина ошибки для логов Vercel и для плеера.
 * Самые частые поломки: не обновлена схема базы (после деплоя забыли `npm run db:push`)
 * и Яндекс/Spotify отклоняют токен. Остальное — как есть, но с текстом, а не «[unhandled]».
 */
export function explainError(e: any): { status: number, message: string } {
  const text = String(e?.cause?.message ?? e?.message ?? e)
  const pgCode = e?.code ?? e?.cause?.code
  // 42703 — нет колонки, 42P01 — нет таблицы
  if (pgCode === '42703' || pgCode === '42P01' || /column .* does not exist|relation .* does not exist/i.test(text)) {
    return { status: 500, message: `База данных не обновлена — выполните npm run db:push (${text})` }
  }
  if (e?.statusCode && e.statusCode < 500 && !e?.response) return { status: e.statusCode, message: e.message }
  const status = e?.response?.status ?? e?.status
  if (status === 401 || status === 403) {
    return { status: 409, message: `Сервис отклонил токен (${status}) — переподключите его в настройках` }
  }
  if (status) return { status: 502, message: `Ошибка сервиса ${status}: ${text}` }
  return { status: 500, message: text }
}

/** Обёртка для обработчика: необработанная ошибка → лог с причиной + понятный ответ. */
export function withExplainedErrors<T>(label: string, handler: (event: Parameters<Parameters<typeof defineEventHandler>[0]>[0]) => Promise<T>) {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event)
    }
    catch (e: any) {
      const { status, message } = explainError(e)
      console.error(`[${label}] ${event.path}: ${message}`)
      throw createError({ statusCode: status, message })
    }
  })
}
