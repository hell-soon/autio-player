import type { AsyncData, NuxtError } from '#app'
import type { MaybeRefOrGetter } from 'vue'

/** Когда данные по ключу были получены (живёт, пока открыта вкладка браузера). */
const fetchedAt = new Map<string, number>()

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

/**
 * useFetch с кэшем на клиенте: при переходах между страницами данные моментально
 * берутся из памяти и не перезапрашиваются, пока свежее ttl.
 * Явное обновление (refresh() / refreshNuxtData(key) после лайка и т.п.) всегда идёт в сеть.
 * После истечения ttl старые данные остаются на экране, пока грузятся новые.
 */
export function useCachedFetch<T>(
  url: MaybeRefOrGetter<string>,
  opts: CachedFetchOptions<T>,
): AsyncData<T, NuxtError | undefined> {
  const { ttl = 5 * 60_000, key, ...rest } = opts
  return useFetch(url as string, {
    ...rest,
    key,
    getCachedData(k: string, nuxtApp: any, ctx?: { cause?: string }) {
      if (ctx?.cause === 'refresh:manual' || ctx?.cause === 'refresh:hook') return undefined
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
    onResponse() {
      fetchedAt.set(key, Date.now())
    },
  } as any) as unknown as AsyncData<T, NuxtError | undefined>
}
