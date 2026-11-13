/**
 * Открыта ли полноэкранная карточка «Сейчас играет».
 * Открытие/закрытие — с View Transition: обложка «перелетает» из мини-плеера в карточку и обратно
 * (имя перехода np-cover стоит у обложки мини-плеера, пока карточка закрыта, и у обложки карточки, пока открыта).
 * Где API нет (Safari < 18) или включено «уменьшить движение» — обычная анимация шторки.
 */
const open = ref(false)
/** Идёт View Transition — карточка не играет свою CSS-анимацию шторки, чтобы не мешать */
const morphing = ref(false)

type DocWithVT = Document & { startViewTransition?: (cb: () => Promise<void> | void) => { finished: Promise<void> } }

function set(value: boolean, animate: boolean) {
  if (open.value === value) return
  const doc = document as DocWithVT
  if (!animate || !doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    open.value = value
    return
  }
  morphing.value = true
  const t = doc.startViewTransition(async () => {
    open.value = value
    await nextTick()
  })
  t.finished.finally(() => (morphing.value = false))
}

export function useNowPlayingView() {
  return {
    open,
    morphing,
    show: (animate = true) => set(true, animate),
    /** animate=false — при уходе со страницы: у Nuxt свой переход, второй его оборвал бы */
    hide: (animate = true) => set(false, animate),
    toggle: () => set(!open.value, true),
  }
}
