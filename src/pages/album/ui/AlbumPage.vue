<script setup lang="ts">
import { useCachedFetch } from '@/shared/lib'
import { AlbumCard } from '@/entities/album'
import { CollectionSkeleton, CollectionView } from '@/widgets/collection-view'
import { TrackList } from '@/widgets/track-list'
import { UiButton, UiEmptyState } from '@/shared/ui'

/** id вида "spotify:ID" / "yandex:ID" */
const props = defineProps<{ id: string }>()

const { data, status, error } = useCachedFetch<Collection>(() => `/api/albums/${encodeURIComponent(props.id)}`, {
  key: `album:${props.id}`,
  ttl: 60 * 60_000,
})

useHead({ title: () => data.value?.title ?? 'Альбом' })

// «Другие альбомы исполнителя»: дискография из страницы исполнителя (тот же ключ кэша — переход туда будет мгновенным)
const artistId = computed(() => data.value?.meta?.artistId)
const { data: artist } = useAsyncData<ArtistPage | null>(
  () => `artist:${artistId.value ?? 'none'}`,
  () => (artistId.value ? $fetch<ArtistPage>(`/api/artists/${encodeURIComponent(artistId.value)}`) : Promise.resolve(null)),
  { server: false, lazy: true, default: () => null },
)
const more = computed(() => (artist.value?.albums ?? []).filter(a => a.id !== data.value?.id && a.id !== props.id).slice(0, 12))
</script>

<template>
  <CollectionSkeleton v-if="status === 'pending' && !data" />
  <UiEmptyState v-else-if="error || !data" title="Не удалось открыть альбом" :text="(error?.data as { message?: string } | undefined)?.message">
    <UiButton @click="$router.back()">
      Назад
    </UiButton>
  </UiEmptyState>
  <CollectionView v-else :collection="data">
    <template #default="{ tracks }">
      <TrackList :tracks="tracks" :show-cover="false" :show-album="false" :highlight="($route.query.t as string | undefined)" />
    </template>
    <template #after>
      <section v-if="more.length" class="more">
        <div class="more__head">
          <h2 class="more__title">
            Ещё у исполнителя
          </h2>
          <NuxtLink v-if="artistId" :to="`/artist/${artistId}`" class="more__all">
            Все релизы
          </NuxtLink>
        </div>
        <div class="more__grid">
          <AlbumCard v-for="a in more" :key="a.id" :album="a" :subtitle="a.year ? String(a.year) : undefined" />
        </div>
      </section>
    </template>
  </CollectionView>
</template>

<style lang="scss" scoped>
.more {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);

  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  &__title {
    font-size: var(--fs-xl);
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  &__all {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
    font-weight: 600;
    text-decoration: none;

    @include hover {
      color: var(--c-text);
    }
  }

  // Горизонтальная лента: на телефоне листается пальцем, страница вбок не уезжает
  &__grid {
    display: grid;
    grid-auto-columns: 160px;
    grid-auto-flow: column;
    gap: var(--space-1);
    margin: 0 calc(var(--space-2) * -1);
    overflow-x: auto;
    scrollbar-width: none;

    @include down(md) {
      grid-auto-columns: 136px;
    }
  }
}

.loading {
  display: grid;
  place-items: center;
  padding: var(--space-7);
  font-size: 24px;
}
</style>
