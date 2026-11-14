import type { AsyncData, NuxtError } from '#app'
import type { MaybeRefOrGetter } from 'vue'

/** Когда данные по ключу были получены (живёт, пока открыта вкладка браузера). */
const fetchedAt = new Map<string, number>()
/** Запросы «в пути» по ключу — общий для страниц и предзагрузки (никаких двойных запросов) */
const inflight = new Map<string, Promise<unknown>>()

export interface CachedFetchOptions<T> {
  key: string
  /** Сколько данные считаются свежими, мс (по умолчанию 5 минут) */
  ttl?: number
  default?: () => T
  query?: Record<string, unknown>
  immediate?: boolean
  lazy?: boolean
  server?: boolean
}

/** Один запрос на ключ: если такой уже идёт (например, предзагрузка по касанию) — ждём его, а не шлём второй. */
function fetchShared<T>(key: string, url: string, query?: Record<string, unknown>, fetcher: typeof $fetch = $fetch): Promise<T> {
  const running = inflight.get(key) as Promise<T> | undefined
  if (running) return running
  const p = fetcher<T>(url, { query })
    .then((data) => {
      fetchedAt.set(key, Date.now())
      return data
    })
    .finally(() => inflight.delete(key)) as Promise<T>
  inflight.set(key, p)
  return p
}

/**
 * Данные страницы с кэшем на клиенте:
 *  - переход на страницу не ждёт данных (lazy): страница открывается сразу со скелетом;
 *  - при переходах данные берутся из памяти, пока свежее ttl;
 *  - если данные уже грузятся (предзагрузка по касанию ссылки — prefetchData) — подхватываем тот же запрос;
 *  - явное обновление (refresh() / refreshNuxtData(key)) и смена адреса (другой период, другой id) идут в сеть;
 *  - после истечения ttl старые данные остаются на экране, пока грузятся новые.
 * При SSR данные приходят вместе с HTML.
 */
export function useCachedFetch<T>(
  url: MaybeRefOrGetter<string>,
  opts: CachedFetchOptions<T>,
): AsyncData<T, NuxtError | undefined> {
  const { ttl = 5 * 60_000, key, query, ...rest } = opts
  const reactiveUrl = typeof url !== 'string'
  // При SSR простой $fetch не передаёт cookie сессии (был бы 401) — useRequestFetch передаёт; на клиенте это обычный $fetch
  const requestFetch = useRequestFetch()
  return useAsyncData<T>(key, () => (import.meta.server
    ? requestFetch<T>(toValue(url), { query }) as Promise<T>
    : fetchShared<T>(key, toValue(url), query)), {
    lazy: true,
    ...rest,
    // Адрес зависит от параметров (период статистики и т.п.) — при их смене грузим заново
    ...(reactiveUrl ? { watch: [() => toValue(url)] } : {}),
    getCachedData(k: string, nuxtApp: any, ctx?: { cause?: string }) {
      // Ручное обновление и смена параметров — всегда свежие данные
      if (ctx?.cause === 'refresh:manual' || ctx?.cause === 'refresh:hook' || ctx?.cause === 'watch') return undefined
      const data = nuxtApp.payload.data[k] ?? nuxtApp.static.data[k]
      if (data === undefined) return undefined
      // Данные пришли с сервера при первой загрузке страницы — считаем свежими.
      if (nuxtApp.isHydrating) {
        fetchedAt.set(k, Date.now())
        return data
      }
      const at = fetchedAt.get(k)
      return at !== undefined && Date.now() - at < ttl ? data : undefined
    },
  } as any) as unknown as AsyncData<T, NuxtError | undefined>
}

/**
 * Загрузить данные страницы заранее (палец коснулся ссылки, мышь навелась) в тот же кэш, что useCachedFetch:
 * страница откроется уже с данными или подхватит этот запрос. Ничего не делает, если данные свежие или уже в пути.
 */
export function prefetchData(nuxtApp: { payload: { data: Record<string, unknown> } }, key: string, url: string, ttl = 5 * 60_000) {
  const at = fetchedAt.get(key)
  if (nuxtApp.payload.data[key] !== undefined && at !== undefined && Date.now() - at < ttl) return
  if (inflight.has(key)) return
  fetchShared(key, url).then((data) => {
    nuxtApp.payload.data[key] = data
  }).catch(() => {})
}
