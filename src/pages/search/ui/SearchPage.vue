<script setup lang="ts">
import { Play, Quote, SearchX } from 'lucide-vue-next'
import { SearchBar, useTrackSearch } from '@/features/search-tracks'
import { AlbumCard } from '@/entities/album'
import { ArtistCard } from '@/entities/artist'
import { usePlayer } from '@/entities/player'
import { useMusicServices } from '@/entities/preferences'
import { TrackList } from '@/widgets/track-list'
import { UiCover, UiEmptyState, UiPageHeader, UiSpinner } from '@/shared/ui'

const NuxtLink = resolveComponent('NuxtLink')
const { query, filter, result, lyricsResult, loading, error } = useTrackSearch()
const player = usePlayer()
const { services } = useMusicServices()

const r = computed(() => result.value)
const isEmpty = computed(() => r.value && !r.value.tracks.length && !r.value.albums.length && !r.value.artists.length)
const lyricsHits = computed(() => (lyricsResult.value?.q === query.value.trim() ? lyricsResult.value.hits : null))

const top = computed(() => r.value?.top ?? null)
const topLink = computed(() => {
  const t = top.value
  if (!t) return undefined
  if (t.kind === 'artist') return `/artist/${t.artist.id}`
  if (t.kind === 'album') return `/album/${t.album.id}`
  return undefined
})
const topView = computed(() => {
  const t = top.value
  if (!t) return null
  if (t.kind === 'artist') return { title: t.artist.name, sub: 'Исполнитель', cover: t.artist.imageUrl, round: true }
  if (t.kind === 'album') return { title: t.album.title, sub: `Альбом · ${t.album.artists.join(', ')}`, cover: t.album.coverUrl, round: false }
  return { title: t.track.title, sub: `Трек · ${t.track.artists.join(', ')}`, cover: t.track.coverUrl, round: false }
})

function playTop() {
  const t = top.value
  if (!t) return
  if (t.kind === 'track') player.playQueue([t.track, ...(r.value?.tracks.filter(x => x.uid !== t.track.uid) ?? [])], 0)
  else if (t.kind === 'artist') player.startRadio({ station: 'artist', name: t.artist.name })
  else navigateTo(`/album/${t.album.id}`)
}
</script>

<template>
  <div class="search">
    <UiPageHeader title="Поиск" />
    <SearchBar />

    <div class="search__results" :class="{ 'is-stale': loading && r }">
      <p v-if="error" class="search__error" role="alert">
        {{ error }}
      </p>

      <!-- По тексту песни -->
      <template v-else-if="filter === 'lyrics'">
        <UiEmptyState v-if="!query.trim()" title="Найдите песню по строчке" text="Вспомнили слова, но не название? Напишите строчку из припева — от трёх слов.">
          <template #icon>
            <Quote />
          </template>
        </UiEmptyState>
        <div v-else-if="loading && !lyricsHits" class="search__loading">
          <UiSpinner />
        </div>
        <UiEmptyState v-else-if="lyricsHits && !lyricsHits.length" title="Ничего не нашлось" text="Попробуйте другую строчку — лучше из припева, без ошибок.">
          <template #icon>
            <SearchX />
          </template>
        </UiEmptyState>
        <div v-else-if="lyricsHits" class="search__panel">
          <TrackList :tracks="lyricsHits.map(h => h.track)" :numbered="false" show-source />
          <ul class="search__lines" aria-label="Совпадения в тексте">
            <li v-for="h in lyricsHits.filter(x => x.line)" :key="h.track.uid">
              <span class="search__line">«{{ h.line }}»</span> — {{ h.track.artists[0] }}, {{ h.track.title }}
            </li>
          </ul>
        </div>
      </template>
      <!-- Ещё ничего не ввели: подсказываем, что умеет поиск -->
      <section v-else-if="!query.trim()" class="search__start">
        <p>Ищите сразу везде: треки, альбомы и исполнителей из {{ services === 'both' ? 'Яндекса и Spotify' : services === 'yandex' ? 'Яндекс Музыки' : 'Spotify' }} в одном списке.</p>
        <button v-if="services !== 'spotify'" type="button" class="search__tip" @click="filter = 'lyrics'">
          <Quote /> Помните только слова? Ищите <b>по тексту песни</b>
        </button>
      </section>
      <div v-else-if="loading && !r" class="search__loading">
        <UiSpinner />
      </div>
      <UiEmptyState v-else-if="query.trim() && isEmpty && !loading" title="Ничего не нашлось" text="Попробуйте написать иначе.">
        <template #icon>
          <SearchX />
        </template>
      </UiEmptyState>

      <template v-else-if="r">
        <!-- Всё -->
        <template v-if="filter === 'all'">
          <div class="search__top-row">
            <section v-if="topView" class="search__section">
              <h2 class="search__heading">
                Лучший результат
              </h2>
              <component :is="topLink ? NuxtLink : 'div'" :to="topLink" class="top-card" @click="!topLink && playTop()">
                <UiCover :src="topView.cover" :size="112" :rounded="topView.round ? 'full' : 'md'" />
                <span class="top-card__title">{{ topView.title }}</span>
                <span class="top-card__sub">{{ topView.sub }}</span>
                <button type="button" class="top-card__play" aria-label="Играть" @click.stop.prevent="playTop">
                  <Play fill="currentColor" />
                </button>
              </component>
            </section>
            <section v-if="r.tracks.length" class="search__section">
              <h2 class="search__heading">
                Треки
              </h2>
              <TrackList :tracks="r.tracks.slice(0, 5)" :numbered="false" :show-album="false" show-source />
            </section>
          </div>

          <section v-if="r.artists.length" class="search__section">
            <h2 class="search__heading">
              Исполнители
            </h2>
            <div class="search__grid">
              <ArtistCard v-for="a in r.artists.slice(0, 7)" :key="a.id" :artist="a" />
            </div>
          </section>

          <section v-if="r.albums.length" class="search__section">
            <h2 class="search__heading">
              Альбомы
            </h2>
            <div class="search__grid">
              <AlbumCard v-for="a in r.albums.slice(0, 7)" :key="a.id" :album="a" />
            </div>
          </section>

          <section v-if="r.tracks.length > 5" class="search__section">
            <h2 class="search__heading">
              Ещё треки
            </h2>
            <div class="search__panel">
              <TrackList :tracks="r.tracks.slice(5)" :numbered="false" :columns="2" :show-album="false" show-source />
            </div>
          </section>
        </template>

        <div v-else-if="filter === 'tracks'" class="search__panel">
          <TrackList :tracks="r.tracks" show-source />
        </div>
        <div v-else-if="filter === 'albums'" class="search__grid">
          <AlbumCard v-for="a in r.albums" :key="a.id" :album="a" />
        </div>
        <div v-else class="search__grid">
          <ArtistCard v-for="a in r.artists" :key="a.id" :artist="a" />
        </div>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.search {
  &__results {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-6);
    margin-top: var(--space-5);
    transition: opacity var(--dur);

    &.is-stale {
      opacity: 0.6;
    }
  }

  &__error {
    color: var(--c-danger);
  }

  &__start {
    display: grid;
    justify-items: start;
    gap: var(--space-3);
    color: var(--c-text-muted);
  }

  &__tip {
    @include reset-button;
    @include focus-ring;

    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-full);
    background: var(--c-surface);
    color: var(--c-text);
    font-size: var(--fs-sm);

    svg {
      width: 16px;
      height: 16px;
      color: var(--c-accent);
    }

    @include hover {
      background: var(--c-surface-hover);
    }
  }

  &__lines {
    display: grid;
    gap: var(--space-1);
    margin: var(--space-3) var(--space-3) var(--space-2);
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
    list-style: none;
  }

  &__line {
    color: var(--c-text);
    font-style: italic;
  }

  &__loading {
    display: grid;
    place-items: center;
    padding: var(--space-7);
    font-size: 24px;
  }

  &__top-row {
    display: grid;
    grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.4fr);
    gap: var(--space-5);

    @include down(lg) {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  &__section {
    display: grid;
    align-content: start;
    gap: var(--space-3);
    min-width: 0;
  }

  &__heading {
    font-size: var(--fs-xl);
    font-weight: 700;
    letter-spacing: -0.02em;
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

  &__panel {
    @include glass;

    padding: var(--space-2);
    border-radius: var(--radius-lg);
  }
}

.top-card {
  @include glass;
  @include focus-ring;

  position: relative;
  display: grid;
  align-content: start;
  gap: var(--space-1);
  min-height: 240px;
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease);

  @include hover {
    background: var(--c-panel-strong);
  }

  :deep(.ui-cover) {
    margin-bottom: var(--space-3);
    box-shadow: var(--shadow-lg);
  }

  &__title {
    @include truncate;

    font-size: var(--fs-2xl);
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  &__sub {
    @include truncate;

    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__play {
    @include reset-button;
    @include focus-ring;

    position: absolute;
    right: var(--space-5);
    bottom: var(--space-5);
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--c-accent);
    color: var(--c-on-accent);
    box-shadow: 0 8px 20px rgb(0 0 0 / 0.3);
    opacity: 0;
    transform: translateY(8px);
    transition: opacity var(--dur) var(--ease), transform var(--dur) var(--ease);

    svg {
      width: 22px;
      height: 22px;
      margin-left: 2px;
    }

    @media (pointer: coarse) {
      opacity: 1;
      transform: none;
    }
  }

  &:hover &__play,
  &:focus-within &__play {
    opacity: 1;
    transform: none;
  }
}
</style>
