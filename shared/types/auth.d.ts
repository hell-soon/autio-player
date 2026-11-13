declare module '#auth-utils' {
  interface User {
    id: string
    name: string
    avatarUrl?: string
    /** Какими сервисами пользуется (нет — оба) */
    services?: MusicServices
  }
}

export {}
