import { useCachedFetch } from '@/shared/lib'

/** Статус подключения Spotify (общий для всех компонентов благодаря ключу useFetch). */
export function useSpotifyAccount() {
  return useCachedFetch<{ connected: false } | { connected: true, name?: string, premium: boolean }>('/api/spotify/me', {
    key: 'spotify-account',
    default: () => ({ connected: false as const }),
  })
}
