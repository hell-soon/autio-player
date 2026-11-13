import { useSourcePreference } from '@/entities/preferences'

export type SearchFilter = 'all' | 'tracks' | 'albums' | 'artists' | 'lyrics'

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
  /** «По тексту»: отдельный, более медленный поиск — только когда выбран этот фильтр */
  const lyricsResult = useState<{ q: string, hits: LyricsSearchHit[] } | null>('search:lyrics', () => null)
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
    if (filter.value === 'lyrics' && lyricsResult.value?.q === q) {
      loading.value = false
      return
    }
    loading.value = true
    error.value = ''
    try {
      if (filter.value === 'lyrics') {
        const hits = await $fetch<LyricsSearchHit[]>('/api/search/lyrics', { query: { q } })
        if (id === requestId) lyricsResult.value = { q, hits }
      }
      else {
        const res = await $fetch<SearchResult>('/api/search', { query: { q, prefer: prefer.value } })
        if (id === requestId) result.value = res // игнорируем устаревшие ответы
      }
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
    // По тексту ищем реже: каждый запрос проверяет тексты нескольких песен
    timer = setTimeout(run, filter.value === 'lyrics' ? 700 : 350)
  }

  return { query, filter, result, lyricsResult, loading, error, run, schedule }
}
