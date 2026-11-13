import { usePlayer } from '@/entities/player'

/**
 * Текст текущей песни — один запрос на трек для всех мест, где он показан
 * (панель в карточке и полноэкранный режим): общий ключ useAsyncData.
 */
export function useCurrentLyrics() {
  const p = usePlayer()
  const { data: lyrics, status } = useAsyncData(
    'lyrics:current',
    () => (p.current.value ? $fetch<Lyrics | null>('/api/lyrics', { method: 'POST', body: { track: p.current.value } }) : Promise.resolve(null)),
    { watch: [() => p.current.value?.uid], server: false, default: () => null },
  )

  // Чуть раньше реального времени — строка успевает подсветиться к моменту, когда её поют.
  const activeIndex = computed(() => {
    const lines = lyrics.value?.synced
    if (!lines) return -1
    const pos = p.position.value + 250
    let i = -1
    for (let k = 0; k < lines.length; k++) {
      if (lines[k]!.t <= pos) i = k
      else break
    }
    return i
  })

  return { lyrics, status, activeIndex }
}
