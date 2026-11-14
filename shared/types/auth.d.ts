declare module '#auth-utils' {
  interface User {
    id: string
    name: string
    avatarUrl?: string
    /** Какими сервисами пользуется (нет — оба) */
    services?: MusicServices
    /** false — ещё не прошёл приветствие (нет — старая сессия, считаем прошедшим) */
    onboarded?: boolean
  }
  interface UserSession {
    /** Эпоха сессий пользователя на момент входа (см. server/utils/session.ts) */
    epoch?: number
  }
}

export {}
