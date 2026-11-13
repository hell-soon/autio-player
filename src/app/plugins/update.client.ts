import { usePlayer } from '@/entities/player'
import { useToast } from '@/shared/ui'

/**
 * Автообновление сайта после деплоя.
 * Новая сборка определяется по /_nuxt/builds/latest.json (Nuxt проверяет сам раз в 5 минут — хук
 * app:manifest:update; мы дополнительно проверяем при возврате на вкладку). Применяется так, чтобы не мешать:
 *  - ничего не играет и вкладка/PWA в фоне — тихая перезагрузка (вернувшись, человек уже в новой версии,
 *    последний трек восстановится на паузе с той же позиции);
 *  - ничего не играет, человек на сайте — при следующем переходе по страницам (грузится сразу новая версия);
 *  - играет музыка — не прерываем: уведомление с кнопкой «Обновить», а само — когда музыка на паузе и вкладка в фоне.
 */
export default defineNuxtPlugin({
  name: 'app-update',
  setup(nuxtApp) {
    const config = useRuntimeConfig()
    const current = config.app.buildId
    const player = usePlayer()
    const toast = useToast()
    const router = useRouter()

    let ready = false
    let lastCheck = 0

    // Музыка играет именно на этом устройстве (пульт другого устройства перезагружать можно)
    const busy = () => player.isPlaying.value && !player.controlling.value
    const apply = (path?: string) => {
      if (path) window.location.assign(path)
      else window.location.reload()
    }

    function found() {
      if (ready || import.meta.dev) return
      ready = true
      // Заодно обновляем service worker (он тоже мог поменяться)
      navigator.serviceWorker?.getRegistration().then(r => r?.update()).catch(() => {})
      if (document.hidden && !busy()) return apply()
      if (busy()) {
        toast.show('Вышло обновление сайта', 'default', 0, { label: 'Обновить', run: () => apply() })
      }
      // Не играет и человек на сайте — обновимся при следующем переходе (router.beforeEach ниже)
    }

    /** Проверить вручную (возврат на вкладку, кнопка в настройках). true — есть новая версия. */
    async function check(force = false) {
      if (import.meta.dev) return false
      if (ready) return true
      if (!force && Date.now() - lastCheck < 60_000) return false
      lastCheck = Date.now()
      try {
        const m = await $fetch<{ id?: string }>(`${config.app.buildAssetsDir}builds/latest.json`, { query: { t: Date.now() } })
        if (m?.id && current && m.id !== current) {
          found()
          return true
        }
      }
      catch {}
      return false
    }

    nuxtApp.hooks.hook('app:manifest:update', found)

    // Переход по сайту — незаметный момент: сразу открываем нужную страницу уже в новой версии
    router.beforeEach((to, from) => {
      if (ready && !busy() && from.matched.length) {
        apply(to.fullPath)
        return false
      }
    })

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (ready && !busy()) apply()
      }
      else void check()
    })
    // Музыку поставили на паузу, а вкладка в фоне — можно обновиться
    watch(player.isPlaying, (playing) => {
      if (!playing && ready && document.hidden && !player.controlling.value) apply()
    })

    return { provide: { appUpdate: { check, apply: () => apply() } } }
  },
})
