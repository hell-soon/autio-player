import { useSourcePreference } from '@/entities/preferences'

const RECENT_KEY = 'search:recent'
const RECENT_MAX = 8

/** Последние запросы — в этом браузере (localStorage), без сервера */
function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, RECENT_MAX) : []
  }
  catch {
    return []
  }
}
function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  }
  catch {}
}

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
  const recent = useState<string[]>('search:recent', () => [])
  const suggestions = useState<string[]>('search:suggestions', () => [])
  if (import.meta.client && !recent.value.length) recent.value = readRecent()

  function remember(q: string) {
    const v = q.trim()
    if (v.length < 2) return
    recent.value = [v, ...recent.value.filter(x => x.toLowerCase() !== v.toLowerCase())].slice(0, RECENT_MAX)
    writeRecent(recent.value)
  }
  function forget(q?: string) {
    recent.value = q ? recent.value.filter(x => x !== q) : []
    writeRecent(recent.value)
  }

  let suggestTimer: ReturnType<typeof setTimeout> | undefined
  let suggestId = 0
  /** Подсказки по мере ввода: быстро (150 мс), отдельно от самого поиска */
  function suggest() {
    clearTimeout(suggestTimer)
    const q = query.value.trim()
    if (q.length < 2) {
      suggestions.value = []
      return
    }
    suggestTimer = setTimeout(async () => {
      const id = ++suggestId
      const list = await $fetch<string[]>('/api/search/suggest', { query: { q } }).catch(() => [] as string[])
      if (id === suggestId && query.value.trim() === q) suggestions.value = list.filter(s => s.toLowerCase() !== q.toLowerCase())
    }, 150)
  }

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
        // Запрос «прижился» (через 1,5 с всё ещё тот же и что-то нашлось) — в последние запросы
        if (res.tracks.length || res.albums.length || res.artists.length) {
          setTimeout(() => {
            if (query.value.trim() === q) remember(q)
          }, 1500)
        }
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

  return { query, filter, result, lyricsResult, loading, error, run, schedule, recent, suggestions, suggest, remember, forget }
}
