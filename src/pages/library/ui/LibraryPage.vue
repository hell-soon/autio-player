<script setup lang="ts">
import { ChartColumn, Heart, History, Search } from 'lucide-vue-next'
import { ImportLikesButton } from '@/features/import-likes'
import { ImportPlaylistsButton } from '@/features/import-playlists'
import { CreatePlaylistButton } from '@/features/manage-playlist'
import { LikedCover, PlaylistCard, PlaylistCover, useLikes, usePlaylists } from '@/entities/library'
import { useMusicServices } from '@/entities/preferences'
import { useSpotifyAccount } from '@/entities/spotify-account'
import { plural, useCachedFetch } from '@/shared/lib'
import { UiButton, UiPageHeader, UiSegmented } from '@/shared/ui'

const { data: playlists } = usePlaylists()
const { data: spotify } = useSpotifyAccount()
const music = useMusicServices()
const showSpotify = computed(() => spotify.value.connected && music.hasSpotify.value)
const { data: spotifyPlaylists, execute: loadSpotifyPlaylists } = useCachedFetch<SpotifyPlaylistInfo[]>('/api/spotify/playlists', {
  key: 'spotify:playlists',
  default: () => [],
  immediate: false,
  ttl: 10 * 60_000,
})
watch(showSpotify, (c) => {
  if (c && !spotifyPlaylists.value.length) loadSpotifyPlaylists()
}, { immediate: true })
const likes = useLikes()
const likedCount = computed(() => likes.ids.value.length)

// «Из Яндекса»: «Мне нравится» и свои плейлисты — как раздел Spotify
const { data: connections } = useCachedFetch<{ yandex: unknown | null }>('/api/me/connections', { key: 'me:connections' })
const showYandex = computed(() => !!connections.value?.yandex && music.hasYandex.value)
const { data: yandexPlaylists, execute: loadYandexPlaylists } = useCachedFetch<ExternalPlaylist[]>('/api/yandex/my-playlists', {
  key: 'yandex:my-playlists',
  default: () => [],
  immediate: false,
  ttl: 10 * 60_000,
})
watch(showYandex, (c) => {
  if (c && !yandexPlaylists.value.length) loadYandexPlaylists()
}, { immediate: true })

// Сортировка и вид своих плейлистов
type Sort = 'recent' | 'name' | 'count'
type View = 'grid' | 'list'
const SORTS: { value: Sort, label: string }[] = [
  { value: 'recent', label: 'Недавние' },
  { value: 'name', label: 'А–Я' },
  { value: 'count', label: 'Больше треков' },
]
const VIEWS: { value: View, label: string }[] = [
  { value: 'grid', label: 'Сетка' },
  { value: 'list', label: 'Список' },
]
const cookieOpts = { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' as const }
const sort = useCookie<Sort>('lib_sort', { ...cookieOpts, default: () => 'recent' })
const view = useCookie<View>('lib_view', { ...cookieOpts, default: () => 'grid' })
const sortedPlaylists = computed(() => {
  const list = [...(playlists.value ?? [])]
  if (sort.value === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  else if (sort.value === 'count') list.sort((a, b) => b.count - a.count)
  return list // «Недавние» — порядок с сервера (по изменению)
})

// Умные плейлисты (пустые сервер не присылает)
const { data: smart } = useCachedFetch<SmartPlaylistInfo[]>('/api/smart', { key: 'library:smart', ttl: 5 * 60_000, default: () => [] })

// Совсем новая библиотека — подсказываем, с чего начать
const isEmpty = computed(() => !likedCount.value && !playlists.value?.length)
</script>

<template>
  <div class="library">
    <div class="library__head">
      <UiPageHeader title="Библиотека" />
      <div class="library__actions">
        <UiButton to="/history">
          <template #icon>
            <History />
          </template>
          История
        </UiButton>
        <UiButton to="/stats">
          <template #icon>
            <ChartColumn />
          </template>
          Статистика
        </UiButton>
        <CreatePlaylistButton />
        <ImportPlaylistsButton />
        <ImportLikesButton />
      </div>
    </div>

    <!-- Сортировка и вид: запоминаются (cookie — одинаково при SSR, без «прыжка») -->
    <div class="library__controls">
      <UiSegmented v-model="sort" :options="SORTS" label="Сортировка" />
      <UiSegmented v-model="view" :options="VIEWS" label="Вид" />
    </div>

    <ul v-if="view === 'list'" class="library__list">
      <li>
        <NuxtLink to="/liked" class="lib-row">
          <LikedCover class="lib-row__cover" />
          <span class="lib-row__text">
            <span class="lib-row__title">Любимые треки</span>
            <span class="lib-row__sub">{{ likedCount }} {{ plural(likedCount, ['трек', 'трека', 'треков']) }}</span>
          </span>
        </NuxtLink>
      </li>
      <li v-for="p in sortedPlaylists" :key="p.id">
        <NuxtLink :to="`/playlist/${p.id}`" class="lib-row">
          <PlaylistCover :covers="p.covers" :name="p.name" :size="48" class="lib-row__cover" />
          <span class="lib-row__text">
            <span class="lib-row__title">{{ p.name }}</span>
            <span class="lib-row__sub">{{ p.count }} {{ plural(p.count, ['трек', 'трека', 'треков']) }}</span>
          </span>
        </NuxtLink>
      </li>
    </ul>

    <div v-else class="library__grid">
      <PlaylistCard to="/liked" title="Любимые треки" :subtitle="`${likedCount} ${plural(likedCount, ['трек', 'трека', 'треков'])}`">
        <template #cover>
          <LikedCover />
        </template>
      </PlaylistCard>
      <PlaylistCard
        v-for="p in sortedPlaylists"
        :key="p.id"
        :to="`/playlist/${p.id}`"
        :title="p.name"
        :subtitle="`${p.count} ${plural(p.count, ['трек', 'трека', 'треков'])}`"
        :covers="p.covers"
      />
    </div>

    <section v-if="isEmpty" class="library__empty">
      <Heart class="library__empty-icon" />
      <div>
        <h2>Здесь соберётся ваша музыка</h2>
        <p>
          Ставьте ♥ трекам — они попадут в «Любимые треки» и в {{ music.services.value === 'both' ? 'ваши сервисы' : music.hasYandex.value ? 'Яндекс Музыку' : 'Spotify' }}.
          Лайки из приложений подтянутся сами. Плейлисты из сервисов можно скопировать кнопкой «Импорт плейлистов».
        </p>
      </div>
      <UiButton to="/search" variant="primary">
        <template #icon>
          <Search />
        </template>
        Найти музыку
      </UiButton>
    </section>

    <template v-if="smart.length">
      <h2 class="library__heading">
        Умные плейлисты
        <small>собираются сами из того, что вы слушаете</small>
      </h2>
      <div class="library__grid">
        <PlaylistCard
          v-for="sp in smart"
          :key="sp.kind"
          :to="`/collection/smart:${sp.kind}`"
          :title="sp.title"
          :subtitle="`${sp.count} ${plural(sp.count, ['трек', 'трека', 'треков'])}`"
          :covers="sp.covers"
        />
      </div>
    </template>

    <template v-if="showYandex">
      <h2 class="library__heading">
        Из Яндекса
      </h2>
      <div class="library__grid">
        <PlaylistCard to="/collection/yandex:liked" title="Мне нравится" subtitle="Яндекс Музыка">
          <template #cover>
            <LikedCover />
          </template>
        </PlaylistCard>
        <PlaylistCard
          v-for="p in yandexPlaylists"
          :key="p.id"
          :to="`/collection/${p.id}`"
          :title="p.title"
          :subtitle="p.count !== undefined ? `${p.count} ${plural(p.count, ['трек', 'трека', 'треков'])}` : 'Яндекс'"
          :covers="p.coverUrl ? [p.coverUrl] : []"
        />
      </div>
    </template>

    <template v-if="showSpotify">
      <h2 class="library__heading">
        Из Spotify
      </h2>
      <div class="library__grid">
        <PlaylistCard to="/collection/spotify:saved" title="Любимое в Spotify" subtitle="Сохранённые треки">
          <template #cover>
            <LikedCover />
          </template>
        </PlaylistCard>
        <PlaylistCard
          v-for="p in spotifyPlaylists.filter(x => x.owned)"
          :key="p.id"
          :to="`/collection/${p.id}`"
          :title="p.title"
          :subtitle="p.count !== undefined ? `${p.count} ${plural(p.count, ['трек', 'трека', 'треков'])}` : 'Spotify'"
          :covers="p.coverUrl ? [p.coverUrl] : []"
        />
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.library {
  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  @include down(md) {
    &__head {
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      margin-bottom: var(--space-4);

      :deep(.page-header) {
        margin-bottom: var(--space-3);
      }
    }

    // Кнопки — одной лентой с прокруткой, а не наезжают на заголовок
    &__actions {
      flex-wrap: nowrap;
      margin-inline: calc(var(--space-4) * -1);
      padding-inline: var(--space-4);
      overflow-x: auto;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }

      > :deep(*) {
        flex: none;
      }
    }
  }

  &__empty {
    @include glass;

    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin-top: var(--space-4);
    padding: var(--space-5);
    border-radius: var(--radius-lg);

    h2 {
      font-size: var(--fs-lg);
    }

    p {
      margin-top: var(--space-1);
      color: var(--c-text-muted);
      font-size: var(--fs-sm);
    }

    > :last-child {
      flex: none;
    }

    @include down(md) {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  &__empty-icon {
    flex: none;
    width: 40px;
    height: 40px;
    color: var(--c-accent);
  }

  &__controls {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  &__list {
    @include glass;

    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 2px;
    padding: var(--space-2);
    border-radius: var(--radius-lg);
    list-style: none;
  }

  &__heading {
    margin: var(--space-6) 0 var(--space-3);
    font-size: var(--fs-xl);
    font-weight: 700;
    letter-spacing: -0.02em;

    small {
      margin-left: var(--space-2);
      color: var(--c-text-subtle);
      font-size: var(--fs-sm);
      font-weight: 500;
      letter-spacing: 0;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
    gap: var(--space-2);

    @include down(sm) {
      grid-template-columns: repeat(2, 1fr);
    }
  }
}

.lib-row {
  @include focus-ring;

  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-2);
  border-radius: var(--radius-md);

  @include hover {
    background: var(--c-surface);
  }

  &__cover,
  :deep(.liked-cover) {
    flex: none;
    width: 48px !important;
    height: 48px !important;
  }

  &__text {
    display: grid;
    min-width: 0;
  }

  &__title {
    @include truncate;

    font-weight: 600;
  }

  &__sub {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }
}
</style>
