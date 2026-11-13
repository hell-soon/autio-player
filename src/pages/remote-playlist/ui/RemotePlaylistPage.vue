<script setup lang="ts">
import { useCachedFetch } from '@/shared/lib'
import { RefreshCw } from 'lucide-vue-next'
import { SaveToLibraryButton } from '@/features/import-playlists'
import { CollectionSkeleton, CollectionView } from '@/widgets/collection-view'
import { TrackList } from '@/widgets/track-list'
import { UiButton, UiEmptyState, UiIconButton, useToast } from '@/shared/ui'

/**
 * Плейлист Яндекса ("yandex:UID:KIND"), Spotify ("spotify:ID" / "spotify:saved")
 * или собранный сайтом микс ("mix:daily" / "mix:discover") — только чтение, можно сохранить копию в библиотеку.
 */
const props = defineProps<{ id: string }>()

const url = computed(() => {
  const [source, ...rest] = props.id.split(':')
  const id = rest.join(':')
  if (source === 'mix') return `/api/mixes/${encodeURIComponent(id)}`
  if (source === 'smart') return `/api/smart/${encodeURIComponent(id)}`
  if (source === 'taste') return `/api/friends/${encodeURIComponent(id)}/common`
  // Плейлист друга ("friend:UID:PID") и его любимые ("friend-liked:UID") — только чтение
  if (source === 'friend') {
    const [uid, pid] = id.split(':')
    return `/api/friends/${encodeURIComponent(uid!)}/playlists/${encodeURIComponent(pid!)}`
  }
  if (source === 'friend-liked') return `/api/friends/${encodeURIComponent(id)}/likes`
  return source === 'spotify' ? `/api/spotify/playlists/${encodeURIComponent(id)}` : `/api/yandex/playlists/${encodeURIComponent(id)}`
})
const isMix = computed(() => props.id.startsWith('mix:'))

const { data, status, error } = useCachedFetch<Collection>(url, { key: `remote:${props.id}`, ttl: 10 * 60_000 })

// Микс можно пересобрать, если сегодняшний не понравился
const toast = useToast()
const rebuilding = ref(false)
async function rebuild() {
  rebuilding.value = true
  try {
    data.value = await $fetch<Collection>(url.value, { query: { fresh: 1 } })
    refreshNuxtData('home:feed')
  }
  catch {
    toast.error('Не удалось пересобрать подборку')
  }
  finally {
    rebuilding.value = false
  }
}
useHead({ title: () => data.value?.title ?? 'Плейлист' })
</script>

<template>
  <CollectionSkeleton v-if="status === 'pending' && !data" />
  <UiEmptyState v-else-if="error || !data" title="Не удалось открыть плейлист" :text="(error?.data as { message?: string } | undefined)?.message">
    <UiButton @click="$router.back()">
      Назад
    </UiButton>
  </UiEmptyState>
  <CollectionView v-else :collection="data" :covers="data.coverUrl ? undefined : data.tracks.slice(0, 4).map(t => t.coverUrl!).filter(Boolean)">
    <template #actions>
      <UiIconButton v-if="isMix" label="Пересобрать" variant="filled" :disabled="rebuilding" @click="rebuild">
        <RefreshCw :class="{ spin: rebuilding }" />
      </UiIconButton>
      <SaveToLibraryButton v-if="data.tracks.length" :id="id" />
    </template>
    <template #empty>
      <UiEmptyState
        v-if="!data.tracks.length"
        :title="isMix ? 'Пока не из чего собрать' : 'Здесь пока пусто'"
        :text="isMix ? 'Послушайте музыку и поставьте пару лайков — подборка соберётся по вашему вкусу.' : undefined"
      />
    </template>
    <template #default="{ tracks }">
      <TrackList :tracks="tracks" />
    </template>
  </CollectionView>
</template>

<style lang="scss" scoped>
.loading {
  display: grid;
  place-items: center;
  padding: var(--space-7);
  font-size: 24px;
}
</style>
