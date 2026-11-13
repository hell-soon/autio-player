import { usePlayer } from '@/entities/player'
import { coverAccent } from '@/shared/lib'
import { useTheme } from './theme'

/**
 * Акцент «Из обложки»: подставляет цвет текущей обложки в --accent-dark / --accent-light на <html>.
 * Вся палитра темы (фон, кнопки, подсветки) выводится из этих двух переменных — меняется всё сразу.
 * Вызывается один раз в макете (только клиент).
 */
export function useCoverAccent() {
  const { accent } = useTheme()
  const player = usePlayer()
  let requestId = 0

  function apply(colors: { dark: string, light: string } | null) {
    const root = document.documentElement.style
    if (colors) {
      root.setProperty('--accent-dark', colors.dark)
      root.setProperty('--accent-light', colors.light)
    }
    else {
      root.removeProperty('--accent-dark')
      root.removeProperty('--accent-light')
    }
  }

  watch(
    () => [accent.value, player.current.value?.coverUrl] as const,
    async ([mode, cover]) => {
      const id = ++requestId
      if (mode !== 'cover' || !cover) {
        // Без трека «Из обложки» выглядит как акцент по умолчанию; другой акцент — из CSS
        if (mode !== 'cover' || !player.current.value) apply(null)
        return
      }
      const colors = await coverAccent(cover)
      // Ч/б обложка — оставляем предыдущий цвет, а не прыгаем на лавандовый
      if (id === requestId && colors) apply(colors)
    },
    { immediate: true },
  )
}
