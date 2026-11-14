import { remoteCollectionUrl } from '@/pages/remote-playlist'
import { prefetchData } from '@/shared/lib'

/**
 * Предзагрузка данных страницы «по намерению»: палец коснулся ссылки (касание → отпускание ≈ 100–300 мс)
 * или мышь задержалась на ней — грузим данные той страницы в общий кэш useCachedFetch.
 * Страница открывается сразу, и часто уже с данными, а не со скелетом.
 * Ключи и адреса — те же, что у страниц (иначе кэш не совпадёт).
 */
function dataFor(path: string): { key: string, url: string, ttl?: number } | null {
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent)
  if (!seg.length) return { key: 'home:feed', url: '/api/home', ttl: 10 * 60_000 }
  const [a, b] = seg
  if (a === 'playlist' && b) return { key: `playlist:${b}`, url: `/api/playlists/${b}` }
  if (a === 'collection' && b) return { key: `remote:${b}`, url: remoteCollectionUrl(b), ttl: 10 * 60_000 }
  if (a === 'album' && b) return { key: `album:${b}`, url: `/api/albums/${encodeURIComponent(b)}` }
  if (a === 'artist' && b) return { key: `artist:${b}`, url: `/api/artists/${encodeURIComponent(b)}`, ttl: 30 * 60_000 }
  if (a === 'liked') return { key: 'library:liked', url: '/api/library/likes' }
  if (a === 'library') return { key: 'library:playlists', url: '/api/playlists' }
  if (a === 'friends' && b) return { key: `friend:${b}`, url: `/api/friends/${b}`, ttl: 20_000 }
  if (a === 'friends') return { key: 'friends:list', url: '/api/friends', ttl: 20_000 }
  return null
}

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()

  function warm(target: EventTarget | null) {
    const link = (target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
    if (!link || link.origin !== location.origin || link.target === '_blank') return
    const path = link.pathname
    if (path === router.currentRoute.value.path || path.startsWith('/api/')) return
    const d = dataFor(path)
    if (d) prefetchData(nuxtApp, d.key, d.url, d.ttl)
  }

  // Касание / нажатие — самый ранний момент перед кликом
  document.addEventListener('pointerdown', e => warm(e.target), { capture: true, passive: true })
  // Мышь задержалась на ссылке ~120 мс — вероятно, сейчас нажмут
  let hoverTimer: ReturnType<typeof setTimeout> | undefined
  document.addEventListener('mouseover', (e) => {
    clearTimeout(hoverTimer)
    const t = e.target
    hoverTimer = setTimeout(() => warm(t), 120)
  }, { passive: true })
})
