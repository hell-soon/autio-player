/**
 * Переходы между страницами (View Transitions Nuxt): двигается только содержимое страницы
 * (view-transition-name: page у .shell__main), меню и плеер стоят на месте.
 * Вперёд — новая страница въезжает справа, «назад» — слева. Стили — в shared/styles/_motion.scss.
 * Атрибут data-vt на <html> отличает переход страниц от других (перелёт обложки в «Сейчас играет»).
 */
export default defineNuxtPlugin((nuxtApp) => {
  let back = false
  window.addEventListener('popstate', () => (back = true))
  nuxtApp.hook('page:view-transition:start', (t) => {
    const root = document.documentElement
    root.dataset.vt = back ? 'back' : 'forward'
    back = false
    t.finished.finally(() => {
      delete root.dataset.vt
    })
  })
  // Переход без View Transition (Safari < 18, «уменьшить движение») — сбрасываем флаг
  useRouter().afterEach(() => setTimeout(() => (back = false), 0))
})
