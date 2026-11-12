import { useSourcePreference } from '@/entities/preferences'

export type SearchFilter = 'all' | 'tracks' | 'albums' | 'artists'

/**
 * Единый поиск по Яндексу и Spotify (треки, альбомы, исполнители) с задержкой ввода.
 * Состояние в useState — сохраняется при переходах между страницами.
 */
export function useTrackSearch() {
  const query = useState('search:query', () => '')
  const filter = useState<SearchFilter>('search:filter', () => 'all')
  const result = useState<SearchResult | null>('search:result', () => null)
  const loading = useState('search:loading', () => false)
  const error = useState('search:error', () => '')
  const prefer = useSourcePreference()

  let timer: ReturnType<typeof setTimeout> | undefined
  let requestId = 0

  async function run() {
    const q = query.value.trim()
    const id = ++requestId
    if (!q) {
      result.value = null
      error.value = ''
      return
    }
    loading.value = true
    error.value = ''
    try {
      const res = await $fetch<SearchResult>('/api/search', { query: { q, prefer: prefer.value } })
      if (id === requestId) result.value = res // игнорируем устаревшие ответы
    }
    catch (e: any) {
      if (id === requestId) error.value = e?.data?.message || e?.message || 'Ошибка поиска'
    }
    finally {
      if (id === requestId) loading.value = false
    }
  }

  function schedule() {
    clearTimeout(timer)
    timer = setTimeout(run, 350)
  }

  return { query, filter, result, loading, error, run, schedule }
}
