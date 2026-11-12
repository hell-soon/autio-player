<script setup lang="ts">
import { useCachedFetch } from '@/shared/lib'
import { CollectionView } from '@/widgets/collection-view'
import { TrackList } from '@/widgets/track-list'
import { UiButton, UiEmptyState, UiSpinner } from '@/shared/ui'

/** Плейлист Яндекса ("yandex:UID:KIND") или Spotify ("spotify:ID" / "spotify:saved") — только чтение. */
const props = defineProps<{ id: string }>()

const url = computed(() => {
  const [source, ...rest] = props.id.split(':')
  const id = rest.join(':')
  return source === 'spotify' ? `/api/spotify/playlists/${encodeURIComponent(id)}` : `/api/yandex/playlists/${encodeURIComponent(id)}`
})

const { data, status, error } = useCachedFetch<Collection>(url, { key: `remote:${props.id}`, ttl: 10 * 60_000 })
useHead({ title: () => data.value?.title ?? 'Плейлист' })
</script>

<template>
  <div v-if="status === 'pending' && !data" class="loading">
    <UiSpinner />
  </div>
  <UiEmptyState v-else-if="error || !data" title="Не удалось открыть плейлист" :text="(error?.data as { message?: string } | undefined)?.message">
    <UiButton @click="$router.back()">
      Назад
    </UiButton>
  </UiEmptyState>
  <CollectionView v-else :collection="data" :covers="data.coverUrl ? undefined : data.tracks.slice(0, 4).map(t => t.coverUrl!).filter(Boolean)">
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
