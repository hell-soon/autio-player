<script setup lang="ts">
import { useCachedFetch } from '@/shared/lib'
import { Heart } from 'lucide-vue-next'
import { CollectionView } from '@/widgets/collection-view'
import { TrackList } from '@/widgets/track-list'
import { UiEmptyState, UiSpinner } from '@/shared/ui'

const { data: tracks, status } = useCachedFetch<Track[]>('/api/library/likes', { key: 'library:liked', default: () => [] })

const collection = computed<Collection>(() => ({
  kind: 'liked',
  id: 'liked',
  title: 'Любимые треки',
  tracks: tracks.value,
}))
</script>

<template>
  <div v-if="status === 'pending' && !tracks.length" class="loading">
    <UiSpinner />
  </div>
  <CollectionView v-else :collection="collection" :covers="tracks.slice(0, 4).map(t => t.coverUrl!).filter(Boolean)">
    <template #empty>
      <UiEmptyState v-if="!tracks.length" title="Пока нет любимых треков" text="Нажмите на сердечко у трека — он появится здесь на всех ваших устройствах.">
        <template #icon>
          <Heart />
        </template>
      </UiEmptyState>
    </template>
    <template #default="{ tracks: list }">
      <TrackList :tracks="list" />
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
