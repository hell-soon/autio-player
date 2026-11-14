import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'

/**
 * Сессия сайта — зашифрованная cookie (nuxt-auth-utils). Отозвать её с сервера нельзя, поэтому
 * в сессии лежит «эпоха» (users.session_epoch на момент входа): «Выйти на других устройствах» повышает
 * эпоху пользователя, и сессии со старой эпохой перестают действовать (проверка — server/middleware/auth.ts).
 */
type SessionUserRow = Parameters<typeof sessionUser>[0] & { sessionEpoch: number }

/** Начать (или обновить) сессию пользователя на этом устройстве */
export async function startSession(event: H3Event, user: SessionUserRow) {
  await replaceUserSession(event, { user: sessionUser(user), epoch: user.sessionEpoch })
}

/** Текущая эпоха пользователя (кэш 60 с: отзыв доходит до всех инстансов не дольше чем за минуту) */
export function userSessionEpoch(userId: string) {
  return cached(`u:${userId}:epoch`, 60_000, async () => {
    try {
      const u = await useDb().query.users.findFirst({ where: eq(schema.users.id, userId), columns: { sessionEpoch: true } })
      // Пользователя больше нет — сессия недействительна
      return u ? u.sessionEpoch : Number.MAX_SAFE_INTEGER
    }
    catch (e) {
      // Схема ещё не применена (забыли npm run db:push) — не ломаем весь сайт, просто без отзыва сессий
      console.error('[session] эпоха недоступна (применена ли схема базы?):', (e as Error).message)
      return 0
    }
  })
}

/** «Название» устройства по User-Agent: «iPhone · Safari», «Mac · Chrome»… */
export function deviceLabel(event: H3Event) {
  const ua = getHeader(event, 'user-agent') ?? ''
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Устройство'
  const br = /YaBrowser/.test(ua) ? 'Яндекс Браузер' : /Edg\//.test(ua) ? 'Edge' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : ''
  return br ? `${os} · ${br}` : os
}
