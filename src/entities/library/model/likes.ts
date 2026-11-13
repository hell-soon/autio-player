import type { ComputedRef } from 'vue'
import { useToast } from '@/shared/ui'

const sets = new WeakMap<object, ComputedRef<Set<string>>>()

/**
 * Лайки: множество uid загружается один раз и обновляется оптимистично —
 * сердечко переключается мгновенно, а при ошибке откатывается.
 */
export function useLikes() {
  const ids = useState<string[]>('likes:ids', () => [])
  const loaded = useState('likes:loaded', () => false)
  const toast = useToast()

  async function load(force = false) {
    if (loaded.value && !force) return
    ids.value = await $fetch<string[]>('/api/library/likes/ids')
    loaded.value = true
  }

  /**
   * Фоновая сверка с Яндексом/Spotify (сервер сам ограничивает частоту).
   * Если что-то изменилось (лайкнули в приложении сервиса) — перечитываем лайки.
   */
  async function syncInBackground() {
    try {
      const r = await $fetch<LikesSyncResult>('/api/library/likes/sync', { method: 'POST' })
      if (r.added || r.removed) {
        await load(true)
        refreshNuxtData('library:liked')
      }
    }
    catch {}
  }

  // Set — проверка за O(1): в плейлисте на сотни треков каждая строка спрашивает «лайкнут ли».
  // Один computed на приложение (ключ — сам ref из useState), а не по одному на каждую кнопку.
  let likedSet = sets.get(ids)
  if (!likedSet) {
    likedSet = computed(() => new Set(ids.value))
    sets.set(ids, likedSet)
  }
  const isLiked = (uid: string) => likedSet!.value.has(uid)

  async function toggle(track: Track) {
    const was = isLiked(track.uid)
    ids.value = was ? ids.value.filter(id => id !== track.uid) : [...ids.value, track.uid]
    try {
      if (was) await $fetch(`/api/library/likes/${encodeURIComponent(track.uid)}`, { method: 'DELETE' })
      else await $fetch('/api/library/likes', { method: 'PUT', body: { track } })
      toast.show(was ? 'Удалено из любимых' : 'Добавлено в любимые')
      refreshNuxtData('library:liked')
    }
    catch {
      ids.value = was ? [...ids.value, track.uid] : ids.value.filter(id => id !== track.uid)
      toast.error('Не удалось сохранить')
    }
  }

  return { ids: readonly(ids), load, syncInBackground, isLiked, toggle }
}
