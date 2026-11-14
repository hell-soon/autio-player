/**
 * Переходы между страницами.
 *
 * Компьютер (pointer: fine) — View Transitions Nuxt: двигается только содержимое страницы
 * (view-transition-name: page у .shell__main), меню и плеер стоят на месте; вперёд — справа, «назад» — слева.
 * Атрибут data-vt на <html> отличает переход страниц от других (перелёт обложки в «Сейчас играет»).
 *
 * Телефон — БЕЗ View Transition: он «замораживает» экран, пока новая страница не готова, и нижнее меню
 * откликалось с задержкой. Там новая страница просто проявляется CSS-анимацией (layouts/default.vue), ничего не блокируя.
 * Стили — shared/styles/_motion.scss.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  const fine = window.matchMedia('(pointer: fine)')
  router.beforeEach((to) => {
    if (!fine.matches) to.meta.viewTransition = false
  })

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
  // Переход без View Transition — сбрасываем флаг
  router.afterEach(() => setTimeout(() => (back = false), 0))
})
