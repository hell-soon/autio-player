import { useLikes } from '@/entities/library'
import { useNowPlayingView, usePlayer } from '@/entities/player'

export const HOTKEYS: { keys: string, action: string }[] = [
  { keys: 'Пробел', action: 'Пауза / воспроизведение' },
  { keys: '← / →', action: 'Перемотка на 10 секунд' },
  { keys: 'Shift + ← / →', action: 'Предыдущий / следующий трек' },
  { keys: 'Shift + ↑ / ↓', action: 'Громкость' },
  { keys: 'M', action: 'Выключить / включить звук' },
  { keys: 'L', action: 'В любимые' },
  { keys: 'F', action: 'Открыть / свернуть «Сейчас играет»' },
  { keys: '/', action: 'Поиск' },
  { keys: '?', action: 'Эта подсказка' },
]

export const hotkeysHelpOpen = ref(false)

/** Горячие клавиши плеера. Не срабатывают, пока пользователь печатает в поле ввода. */
export function useHotkeys() {
  const p = usePlayer()
  const likes = useLikes()
  const view = useNowPlayingView()

  function isTyping(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null
    return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
  }

  function onKey(e: KeyboardEvent) {
    if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return
    const key = e.key
    const has = !!p.current.value

    if (key === ' ' && has) {
      // Пробел на кнопке нажимает её — пусть так и будет.
      if ((e.target as HTMLElement)?.tagName === 'BUTTON') return
      e.preventDefault()
      p.toggle()
    }
    else if (key === 'ArrowRight' && has) {
      e.preventDefault()
      if (e.shiftKey) p.next()
      else p.seek(Math.min(p.duration.value, p.position.value + 10_000))
    }
    else if (key === 'ArrowLeft' && has) {
      e.preventDefault()
      if (e.shiftKey) p.previous()
      else p.seek(Math.max(0, p.position.value - 10_000))
    }
    else if (e.shiftKey && (key === 'ArrowUp' || key === 'ArrowDown')) {
      e.preventDefault()
      p.setVolume(Math.round((p.volume.value + (key === 'ArrowUp' ? 0.05 : -0.05)) * 100) / 100)
    }
    else if ((key === 'm' || key === 'M' || key === 'ь' || key === 'Ь')) {
      p.toggleMute()
    }
    else if ((key === 'l' || key === 'L' || key === 'д' || key === 'Д') && p.current.value) {
      likes.toggle(p.current.value)
    }
    else if ((key === 'f' || key === 'F' || key === 'а' || key === 'А') && has) {
      view.toggle()
    }
    else if (key === '/' || key === '.') {
      e.preventDefault()
      navigateTo('/search')
    }
    else if (key === '?' || key === ',') {
      if (key === ',' && !e.shiftKey) return
      hotkeysHelpOpen.value = true
    }
  }

  onMounted(() => window.addEventListener('keydown', onKey))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
}
