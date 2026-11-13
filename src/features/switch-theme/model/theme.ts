export type ThemeMode = 'system' | 'dark' | 'light'
/** cover — цвет из обложки текущего трека (без трека — как «Лаванда») */
export type Accent = 'lavender' | 'sage' | 'peach' | 'sky' | 'cover'

export const ACCENTS: { value: Accent, label: string }[] = [
  { value: 'lavender', label: 'Лаванда' },
  { value: 'sage', label: 'Шалфей' },
  { value: 'peach', label: 'Персик' },
  { value: 'sky', label: 'Небо' },
  { value: 'cover', label: 'Из обложки' },
]

export const THEME_MODES: { value: ThemeMode, label: string }[] = [
  { value: 'system', label: 'Как в системе' },
  { value: 'dark', label: 'Тёмная' },
  { value: 'light', label: 'Светлая' },
]

const cookieOpts = { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' as const }

/**
 * Тема хранится в cookie (а не localStorage), чтобы сервер сразу отрисовал
 * правильную тему и страница не «мигала» при загрузке.
 */
export function useTheme() {
  const mode = useCookie<ThemeMode>('theme', { ...cookieOpts, default: () => 'system' })
  const accent = useCookie<Accent>('accent', { ...cookieOpts, default: () => 'lavender' })
  return { mode, accent }
}

/** Ставит data-theme / data-accent на <html>. Вызывается один раз в корне приложения. */
export function useThemeHead() {
  const { mode, accent } = useTheme()
  useHead({
    htmlAttrs: {
      'data-theme': mode,
      'data-accent': accent,
    },
  })
}
