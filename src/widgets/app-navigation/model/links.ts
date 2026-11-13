import { ChartColumn, House, Library, Search, Settings, Users } from 'lucide-vue-next'
import { useCachedFetch } from '@/shared/lib'

/** Основные разделы: и в боковой панели, и в нижнем меню телефона (там — не больше пяти пунктов). */
export const NAV_LINKS = [
  { to: '/', label: 'Главная', icon: House },
  { to: '/search', label: 'Поиск', icon: Search },
  { to: '/library', label: 'Библиотека', icon: Library },
  { to: '/friends', label: 'Друзья', icon: Users },
] as const

/** Только в боковой панели (на телефоне «Статистика» открывается из библиотеки) */
export const RAIL_EXTRA_LINKS = [
  { to: '/stats', label: 'Статистика', icon: ChartColumn },
] as const

export const SETTINGS_LINK = { to: '/settings', label: 'Настройки', icon: Settings } as const

/** Сколько непросмотренных треков прислали друзья — значок на «Друзьях» */
export function useUnseenShares() {
  return useCachedFetch<{ count: number }>('/api/shares/unseen', { key: 'shares:unseen', ttl: 60_000, default: () => ({ count: 0 }) })
}
