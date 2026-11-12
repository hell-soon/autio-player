import { ChartColumn, House, Library, Search, Settings } from 'lucide-vue-next'

export const NAV_LINKS = [
  { to: '/', label: 'Главная', icon: House },
  { to: '/search', label: 'Поиск', icon: Search },
  { to: '/library', label: 'Библиотека', icon: Library },
  { to: '/stats', label: 'Статистика', icon: ChartColumn },
] as const

export const SETTINGS_LINK = { to: '/settings', label: 'Настройки', icon: Settings } as const
