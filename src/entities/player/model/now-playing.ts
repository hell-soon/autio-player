/** Открыта ли полноэкранная карточка «Сейчас играет». */
const open = ref(false)

export function useNowPlayingView() {
  return {
    open,
    show: () => (open.value = true),
    hide: () => (open.value = false),
    toggle: () => (open.value = !open.value),
  }
}
