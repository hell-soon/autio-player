<script setup lang="ts">
import { useCachedFetch } from '@/shared/lib'
import { CollectionView } from '@/widgets/collection-view'
import { TrackList } from '@/widgets/track-list'
import { UiButton, UiEmptyState, UiSpinner } from '@/shared/ui'

/** id вида "spotify:ID" / "yandex:ID" */
const props = defineProps<{ id: string }>()

const { data, status, error } = useCachedFetch<Collection>(() => `/api/albums/${encodeURIComponent(props.id)}`, {
  key: `album:${props.id}`,
  ttl: 60 * 60_000,
})

useHead({ title: () => data.value?.title ?? 'Альбом' })
</script>

<template>
  <div v-if="status === 'pending' && !data" class="loading">
    <UiSpinner />
  </div>
  <UiEmptyState v-else-if="error || !data" title="Не удалось открыть альбом" :text="(error?.data as { message?: string } | undefined)?.message">
    <UiButton @click="$router.back()">
      Назад
    </UiButton>
  </UiEmptyState>
  <CollectionView v-else :collection="data">
    <template #default="{ tracks }">
      <TrackList :tracks="tracks" :show-cover="false" :show-album="false" :highlight="($route.query.t as string | undefined)" />
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
