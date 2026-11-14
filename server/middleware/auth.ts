// Все /api/* требуют входа, кроме маршрутов самого входа.
// Иначе любой, кто найдёт сайт, будет пользоваться сервисами через чужие токены.
const PUBLIC = new Set([
  '/api/_auth/session',
  '/api/auth/yandex/device',
  '/api/auth/yandex/poll',
  '/api/auth/spotify/login',
  '/api/auth/spotify/callback',
  '/api/auth/config',
  // Вход с другого устройства: новое устройство ещё без сессии
  '/api/auth/link/start',
  '/api/auth/link/poll',
  // Вход по Face ID / Touch ID (passkey)
  '/api/webauthn/authenticate',
])

export default defineEventHandler(async (event) => {
  // Сессии старого формата (вход по паролю, без id пользователя) сбрасываем — нужно войти заново.
  const session = await getUserSession(event)
  if (session.user && !session.user.id) await clearUserSession(event)

  const path = event.path.split('?')[0]!
  // «Выйти на других устройствах»: сессия старше эпохи пользователя больше не действует.
  // Только для API и страниц (не для файлов) — проверка идёт в базу (с кэшем на минуту).
  if (session.user?.id && (path.startsWith('/api/') || !path.includes('.'))) {
    const epoch = await userSessionEpoch(session.user.id)
    if ((session.epoch ?? 0) < epoch) {
      // Стираем cookie И сразу отвечаем: дальше в этом же запросе библиотека снова прочла бы сессию
      // из cookie запроса — и отозванная сессия «ожила» бы
      await clearUserSession(event)
      if (path === '/api/_auth/session') return {}
      if (path.startsWith('/api/')) throw createError({ statusCode: 401, message: 'Сессия завершена — войдите снова' })
      return sendRedirect(event, '/login', 302)
    }
  }

  if (!path.startsWith('/api/') || PUBLIC.has(path)) return
  await requireUserSession(event)
})
