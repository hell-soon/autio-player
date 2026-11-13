/**
 * «Видеошот» трека Яндекса — короткое зацикленное видео вместо обложки (как в приложении Яндекс Музыки).
 * Поле backgroundVideoUri есть не у всех треков; формат ссылки в API не задокументирован —
 * отдаём только https-ссылки на домены Яндекса. Клиент сам скрывает видео, если оно не загрузилось.
 */
export default defineEventHandler(async (event): Promise<{ url: string | null }> => {
  const id = decodeURIComponent(getRouterParam(event, 'id') ?? '').split(':')[0]!
  if (!/^\d+$/.test(id)) throw createError({ statusCode: 400, message: 'Неверный id трека' })
  await requireUserId(event)
  // Видео одно для всех пользователей — кэш общий
  return cached(`track-video:${id}`, 24 * 3600_000, async () => {
    const res = await ymGet<{ result?: any[] }>(event, `/tracks/${id}`).catch(() => null)
    const raw: unknown = res?.result?.[0]?.backgroundVideoUri
    if (typeof raw !== 'string' || !raw) return { url: null }
    const url = raw.startsWith('http') ? raw : `https://${raw.replace(/^\/+/, '')}`
    return { url: /^https:\/\/([\w-]+\.)*(yandex\.net|yandex\.ru|yastatic\.net|ya\.ru)\//.test(url) ? url : null }
  })
})
