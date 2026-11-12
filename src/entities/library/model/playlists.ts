import { useCachedFetch } from '@/shared/lib'

export interface PlaylistSummary {
  id: string
  name: string
  count: number
  covers: string[]
  updatedAt: number
}

/** Список плейлистов (общий для всех компонентов через ключ). */
export function usePlaylists() {
  return useCachedFetch<PlaylistSummary[]>('/api/playlists', {
    key: 'library:playlists',
    default: () => [],
  })
}

export const refreshPlaylists = () => refreshNuxtData('library:playlists')
