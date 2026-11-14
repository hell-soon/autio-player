<script setup lang="ts">
import { formatCount, genreLabel, plural, useCachedFetch } from '@/shared/lib'
import { Play, Radio } from 'lucide-vue-next'
import { AlbumCard } from '@/entities/album'
import { ArtistCard } from '@/entities/artist'
import { usePlayer } from '@/entities/player'
import { TrackList } from '@/widgets/track-list'
import { UiButton, UiCover, UiEmptyState, UiSegmented, UiSkeleton, UiSkeletonRows } from '@/shared/ui'

/** id: "yandex:ID" или "spotify:ID" (Spotify-исполнитель ищется в Яндексе). */
const props = defineProps<{ id: string }>()
const player = usePlayer()

const { data, status, error } = useCachedFetch<ArtistPage>(() => `/api/artists/${encodeURIComponent(props.id)}`, { key: `artist:${props.id}`, ttl: 30 * 60_000 })
useHead({ title: () => data.value?.artist.name ?? 'Исполнитель' })

const showAll = ref(false)
const tracks = computed(() => (showAll.value ? data.value?.tracks : data.value?.tracks.slice(0, 5)) ?? [])

// Цифры под именем: слушатели, лайки, ваши прослушивания
const stats = computed(() => {
  const d = data.value
  if (!d) return []
  return [
    d.listeners ? `${formatCount(d.listeners)} ${plural(d.listeners, ['слушатель', 'слушателя', 'слушателей'])} за месяц` : '',
    d.likes ? `♥ ${formatCount(d.likes)}` : '',
    d.yourPlays ? `Вы слушали ${d.yourPlays} ${plural(d.yourPlays, ['раз', 'раза', 'раз'])}` : '',
  ].filter(Boolean)
})
const bioOpen = ref(false)

// Дискография по типу: альбомы, синглы и EP, сборники (вкладка — только если такие есть)
type Disc = 'all' | 'album' | 'single' | 'compilation'
const disc = ref<Disc>('all')
const DISC_LABEL: Record<Exclude<Disc, 'all'>, string> = { album: 'Альбомы', single: 'Синглы и EP', compilation: 'Сборники' }
const discTabs = computed(() => {
  const have = new Set((data.value?.albums ?? []).map(a => a.type ?? 'album'))
  const tabs = (['album', 'single', 'compilation'] as const).filter(t => have.has(t))
  return tabs.length > 1 ? [{ value: 'all' as Disc, label: 'Все' }, ...tabs.map(t => ({ value: t as Disc, label: DISC_LABEL[t] }))] : []
})
const albums = computed(() => (data.value?.albums ?? []).filter(a => disc.value === 'all' || (a.type ?? 'album') === disc.value))
watch(() => props.id, () => {
  disc.value = 'all'
  bioOpen.value = false
  showAll.value = false
})

function playPopular() {
  if (data.value?.tracks.length) player.playQueue(data.value.tracks, 0, { shuffle: false })
}
</script>

<template>
  <div v-if="status === 'pending' && !data" class="page-skeleton">
    <div class="page-skeleton__head">
      <UiSkeleton width="112px" height="112px" circle />
      <div class="page-skeleton__lines">
        <UiSkeleton width="min(320px, 60vw)" height="36px" radius="var(--radius-md)" />
        <UiSkeleton width="140px" height="14px" />
      </div>
    </div>
    <UiSkeletonRows :count="6" />
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
        <p v-if="stats.length" class="artist__stats">
          <span v-for="s in stats" :key="s">{{ s }}</span>
        </p>
        <p v-if="data.genres?.length" class="artist__genres">
          <span v-for="g in data.genres" :key="g" class="artist__genre">{{ genreLabel(g) }}</span>
        </p>
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

    <!-- Об исполнителе — сразу под шапкой, свёрнуто до трёх строк -->
    <section v-if="data.bio" class="artist__section" aria-label="Об исполнителе">
      <div class="artist__bio" :class="{ 'is-open': bioOpen }">
        <p>{{ data.bio }}</p>
        <button v-if="data.bio.length > 160" type="button" class="artist__more" @click="bioOpen = !bioOpen">
          {{ bioOpen ? 'Свернуть' : 'Читать полностью' }}
        </button>
      </div>
    </section>

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
        Дискография
      </h2>
      <UiSegmented v-if="discTabs.length" v-model="disc" :options="discTabs" label="Тип релизов" class="artist__filters" />
      <div class="artist__grid">
        <AlbumCard v-for="a in albums" :key="a.id" :album="a" />
      </div>
    </section>

    <section v-if="data.similar.length" class="artist__section">
      <h2 class="artist__heading">
        Похожие исполнители
      </h2>
      <div class="artist__grid is-people">
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
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-6);

  @include down(md) {
    gap: var(--space-5);
  }

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

  &__stats {
    display: flex;
    flex-wrap: wrap;
    gap: 4px var(--space-3);
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
    font-weight: 500;

    @include down(md) {
      justify-content: center;
    }
  }

  &__genres {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    @include down(md) {
      justify-content: center;
    }
  }

  &__genre {
    padding: 2px 10px;
    border-radius: var(--radius-full);
    background: var(--c-surface);
    color: var(--c-text-muted);
    font-size: var(--fs-xs);
    font-weight: 600;
  }

  &__filters {
    justify-self: start;
    max-width: 100%;
    overflow-x: auto;
  }

  &__bio {
    @include glass;

    display: grid;
    justify-items: start;
    padding: var(--space-4) var(--space-4) var(--space-2);
    border-radius: var(--radius-lg);
    color: var(--c-text-muted);
    line-height: 1.55;

    p {
      display: -webkit-box;
      overflow: hidden;
      white-space: pre-line;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }

    &.is-open p {
      display: block;
    }

    .artist__more {
      padding-inline: 0;
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  &__section {
    display: grid;
    // minmax(0, …): иначе лента альбомов растягивает колонку и страница уезжает вбок
    grid-template-columns: minmax(0, 1fr);
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

    // Телефон: не сетка на десятки экранов, а лента — листается пальцем вбок (как на главной)
    @include down(md) {
      grid-template-columns: none;
      grid-auto-flow: column;
      grid-auto-columns: 42%;
      margin: 0 calc(var(--space-4) * -1);
      padding: 0 var(--space-2);
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scroll-padding-inline: var(--space-2);
      scroll-snap-type: x mandatory;
      scrollbar-width: none;

      > * {
        scroll-snap-align: start;
      }

      // Исполнители — круглые фото, их можно мельче
      &.is-people {
        grid-auto-columns: 34%;
      }
    }
  }
}

// Заглушка на время загрузки — повторяет раскладку страницы, чтобы ничего не «прыгало»
.page-skeleton {
  display: grid;
  gap: var(--space-5);

  &__head {
    display: flex;
    align-items: center;
    gap: var(--space-5);
  }

  &__lines {
    display: grid;
    gap: var(--space-2);
  }
}
</style>
