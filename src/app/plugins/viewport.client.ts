/**
 * Обход бага iOS в установленном PWA (статус-бар black-translucent): браузер считает видимую область
 * короче экрана на высоту статус-бара — всё, что прижато к низу (меню, плеер), стоит над пустой полосой.
 * CSS это не лечит (100dvh, fixed inset: 0 — тоже «короткие»), поэтому только на iPhone в режиме PWA
 * и только если высота действительно занижена, задаём высоту каркаса по экрану:
 *   --app-height — полная высота экрана, --app-gap — на сколько iOS её занизила (для fixed-слоёв снизу).
 */
export default defineNuxtPlugin(() => {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
    || window.matchMedia('(display-mode: standalone)').matches
  if (!standalone || !/iPhone/.test(navigator.userAgent)) return

  const root = document.documentElement
  function update() {
    const portrait = window.matchMedia('(orientation: portrait)').matches
    const screenH = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height)
    const gap = screenH - window.innerHeight
    // Небольшие расхождения — не баг (например, клавиатура меняет innerHeight — тогда не вмешиваемся)
    if (gap > 0 && gap < 80) {
      root.style.setProperty('--app-height', `${screenH}px`)
      root.style.setProperty('--app-gap', `${gap}px`)
    }
    else {
      root.style.removeProperty('--app-height')
      root.style.removeProperty('--app-gap')
    }
  }

  update()
  window.addEventListener('resize', update)
  window.addEventListener('orientationchange', () => setTimeout(update, 300))
})
