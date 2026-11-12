// Все /api/* требуют входа, кроме маршрутов самого входа.
// Иначе любой, кто найдёт сайт, будет пользоваться сервисами через чужие токены.
const PUBLIC = new Set([
  '/api/_auth/session',
  '/api/auth/yandex/device',
  '/api/auth/yandex/poll',
  '/api/auth/spotify/login',
  '/api/auth/spotify/callback',
  '/api/auth/config',
])

export default defineEventHandler(async (event) => {
  // Сессии старого формата (вход по паролю, без id пользователя) сбрасываем — нужно войти заново.
  const session = await getUserSession(event)
  if (session.user && !session.user.id) await clearUserSession(event)

  const path = event.path.split('?')[0]!
  if (!path.startsWith('/api/') || PUBLIC.has(path)) return
  await requireUserSession(event)
})
