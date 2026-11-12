<script setup lang="ts">
import { useCachedFetch } from '@/shared/lib'
import { ListMusic } from 'lucide-vue-next'
import { PlaylistMenu } from '@/features/manage-playlist'
import { refreshPlaylists } from '@/entities/library'
import { CollectionView } from '@/widgets/collection-view'
import { TrackList } from '@/widgets/track-list'
import { UiButton, UiEmptyState, UiSpinner, useToast } from '@/shared/ui'

const props = defineProps<{ id: string }>()
const toast = useToast()

const { data, status, error, refresh } = useCachedFetch<Collection>(() => `/api/playlists/${props.id}`, {
  key: `playlist:${props.id}`,
})

useHead({ title: () => data.value?.title ?? 'Плейлист' })

const covers = computed(() => [...new Set((data.value?.tracks ?? []).map(t => t.coverUrl).filter(Boolean) as string[])].slice(0, 4))

async function remove(t: Track) {
  await $fetch(`/api/playlists/${props.id}/tracks/${encodeURIComponent(t.uid)}`, { method: 'DELETE' })
  toast.show('Удалено из плейлиста')
  await refresh()
  refreshPlaylists()
}
</script>

<template>
  <div v-if="status === 'pending' && !data" class="loading">
    <UiSpinner />
  </div>
  <UiEmptyState v-else-if="error || !data" title="Плейлист не найден">
    <UiButton to="/library">
      В библиотеку
    </UiButton>
  </UiEmptyState>
  <CollectionView v-else :collection="data" :covers="covers">
    <template #actions>
      <PlaylistMenu :id="data.id" :name="data.title" @renamed="refresh()" />
    </template>
    <template #empty>
      <UiEmptyState v-if="!data.tracks.length" title="В плейлисте пока нет треков" text="Добавляйте треки через меню «⋮» → «Добавить в плейлист».">
        <template #icon>
          <ListMusic />
        </template>
        <UiButton to="/search" variant="primary">
          Найти музыку
        </UiButton>
      </UiEmptyState>
    </template>
    <template #default="{ tracks }">
      <TrackList :tracks="tracks" removable @remove="remove" />
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
