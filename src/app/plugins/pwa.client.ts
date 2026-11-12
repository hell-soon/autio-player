/** Регистрация service worker (PWA). В режиме разработки не включаем — мешал бы горячей перезагрузке. */
export default defineNuxtPlugin(() => {
  if (import.meta.dev || !('serviceWorker' in navigator)) return
  const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {})
  // Событие load могло уже пройти к моменту запуска плагина.
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
})
