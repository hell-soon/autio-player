<script setup lang="ts">
import { useCachedFetch } from '@/shared/lib'
import { Play, Radio } from 'lucide-vue-next'
import { AlbumCard } from '@/entities/album'
import { ArtistCard } from '@/entities/artist'
import { usePlayer } from '@/entities/player'
import { TrackList } from '@/widgets/track-list'
import { UiButton, UiCover, UiEmptyState, UiSpinner } from '@/shared/ui'

/** id: "yandex:ID" или "spotify:ID" (Spotify-исполнитель ищется в Яндексе). */
const props = defineProps<{ id: string }>()
const player = usePlayer()

const { data, status, error } = useCachedFetch<ArtistPage>(() => `/api/artists/${encodeURIComponent(props.id)}`, { key: `artist:${props.id}`, ttl: 30 * 60_000 })
useHead({ title: () => data.value?.artist.name ?? 'Исполнитель' })

const showAll = ref(false)
const tracks = computed(() => (showAll.value ? data.value?.tracks : data.value?.tracks.slice(0, 5)) ?? [])

function playPopular() {
  if (data.value?.tracks.length) player.playQueue(data.value.tracks, 0, { shuffle: false })
}
</script>

<template>
  <div v-if="status === 'pending' && !data" class="loading">
    <UiSpinner />
  </div>
  <UiEmptyState v-else-if="error || !data" title="Не удалось открыть исполнителя" :text="(error?.data as { message?: string } | undefined)?.message">
    <UiButton @click="$router.back()">
      Назад
    </UiButton>
  </UiEmptyState>

  <div v-else class="artist">
    <header class="artist__header">
      <UiCover :src="data.artist.imageUrl" :size="200" rounded="full" class="artist__photo" />
      <div class="artist__info">
        <span class="artist__kind">Исполнитель</span>
        <h1 class="artist__name">
          {{ data.artist.name }}
        </h1>
        <div class="artist__actions">
          <UiButton variant="primary" :disabled="!data.tracks.length" @click="playPopular">
            <template #icon>
              <Play fill="currentColor" />
            </template>
            Слушать
          </UiButton>
          <UiButton @click="player.startRadio({ station: 'artist', name: data.artist.name })">
            <template #icon>
              <Radio />
            </template>
            Радио исполнителя
          </UiButton>
        </div>
      </div>
    </header>

    <section v-if="data.tracks.length" class="artist__section">
      <h2 class="artist__heading">
        Популярные треки
      </h2>
      <div class="artist__panel">
        <TrackList :tracks="tracks" :show-album="true" />
        <button v-if="data.tracks.length > 5" type="button" class="artist__more" @click="showAll = !showAll">
          {{ showAll ? 'Свернуть' : `Показать ещё ${data.tracks.length - 5}` }}
        </button>
      </div>
    </section>

    <section v-if="data.albums.length" class="artist__section">
      <h2 class="artist__heading">
        Альбомы и синглы
      </h2>
      <div class="artist__grid">
        <AlbumCard v-for="a in data.albums" :key="a.id" :album="a" />
      </div>
    </section>

    <section v-if="data.similar.length" class="artist__section">
      <h2 class="artist__heading">
        Похожие исполнители
      </h2>
      <div class="artist__grid">
        <ArtistCard v-for="a in data.similar" :key="a.id" :artist="a" />
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.loading {
  display: grid;
  place-items: center;
  padding: var(--space-7);
  font-size: 24px;
}

.artist {
  display: grid;
  gap: var(--space-6);

  &__header {
    position: relative;
    display: flex;
    align-items: flex-end;
    gap: var(--space-5);

    @include down(md) {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
  }

  &__photo {
    box-shadow: var(--shadow-lg);

    @include down(md) {
      width: 160px !important;
      height: 160px !important;
    }
  }

  &__info {
    display: grid;
    justify-items: start;
    gap: var(--space-2);

    @include down(md) {
      justify-items: center;
    }
  }

  &__kind {
    color: var(--c-text-muted);
    font-size: var(--fs-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  &__name {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  &__section {
    display: grid;
    gap: var(--space-3);
  }

  &__heading {
    font-size: var(--fs-xl);
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  &__panel {
    @include glass;

    padding: var(--space-2);
    border-radius: var(--radius-lg);
  }

  &__more {
    @include reset-button;

    padding: var(--space-3) var(--space-3) var(--space-2);
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
    font-weight: 600;

    @include hover {
      color: var(--c-text);
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: var(--space-1);
    margin: 0 calc(var(--space-2) * -1);

    @include down(sm) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}
</style>
