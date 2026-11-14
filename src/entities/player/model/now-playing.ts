/**
 * Открыта ли полноэкранная карточка «Сейчас играет».
 *
 * Открытие/закрытие — View Transition, как в нативных плеерах: карточка (np-sheet) выезжает снизу,
 * а обложка (np-cover) одновременно «перелетает» из мини-плеера на своё место. Стили — shared/styles/_motion.scss.
 * Пока идёт переход, на <html> стоит data-vt="np-open|np-close": у содержимого страницы на это время снимаются
 * свои имена переходов (page, cover-hero) — иначе страница рисовалась бы ПОВЕРХ выезжающей карточки.
 * Где API нет (Safari < 18) или включено «уменьшить движение» — CSS-анимация шторки.
 */
const open = ref(false)
/** Идёт View Transition — карточка не играет свою CSS-анимацию шторки, чтобы не мешать */
const morphing = ref(false)

type VT = { finished: Promise<void>, skipTransition?: () => void }
type DocWithVT = Document & { startViewTransition?: (cb: () => Promise<void> | void) => VT }

let running: VT | null = null

/** Ждём, пока большая обложка карточки декодируется (не дольше 250 мс) — иначе перелетит пустой квадрат */
function coverReady() {
  const img = document.querySelector<HTMLImageElement>('.np__cover img')
  if (!img || (img.complete && img.naturalWidth)) return Promise.resolve()
  return Promise.race([
    img.decode().catch(() => {}),
    new Promise<void>(r => setTimeout(r, 250)),
  ])
}

function set(value: boolean, animate: boolean) {
  if (open.value === value) return
  const doc = document as DocWithVT
  // Прошлый переход ещё идёт (двойное нажатие) — завершаем его сразу
  running?.skipTransition?.()
  if (!animate || !doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    open.value = value
    return
  }
  morphing.value = true
  const root = document.documentElement
  // До снимка «до»: атрибут должен уже стоять, когда браузер фотографирует страницу
  root.dataset.vt = value ? 'np-open' : 'np-close'
  const t = doc.startViewTransition(async () => {
    open.value = value
    await nextTick()
    if (value) await coverReady()
  })
  running = t
  t.finished.catch(() => {}).finally(() => {
    if (running !== t) return
    running = null
    morphing.value = false
    if (root.dataset.vt?.startsWith('np-')) delete root.dataset.vt
  })
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
