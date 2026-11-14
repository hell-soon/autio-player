import type { Ref } from 'vue'

/**
 * Картинка, которая меняется только когда новая уже загружена и декодирована.
 * Для размытых фонов из обложки: иначе при смене трека старый фон гаснет раньше, чем появится новый,
 * и на мгновение видно «пустоту» (особенно при быстром свайпе треков). При нескольких сменах подряд
 * применяется только последняя. Нет картинки — сразу пусто.
 */
export function useLoadedSrc(source: () => string | undefined): Ref<string | undefined> {
  const shown = ref<string | undefined>(source())
  let seq = 0
  watch(source, (src) => {
    const id = ++seq
    if (!src) {
      shown.value = undefined
      return
    }
    if (import.meta.server) {
      shown.value = src
      return
    }
    const img = new Image()
    img.decoding = 'async'
    img.src = src
    img.decode()
      .catch(() => new Promise<void>((resolve) => {
        // decode() в некоторых браузерах падает на уже закэшированной картинке — ждём обычной загрузки
        if (img.complete) resolve()
        else img.onload = img.onerror = () => resolve()
      }))
      .then(() => {
        if (id === seq) shown.value = src
      })
  })
  return shown
}
