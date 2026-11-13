<script setup lang="ts">
import { Heart, Search } from 'lucide-vue-next'
import { ImportLikesButton } from '@/features/import-likes'
import { ImportPlaylistsButton } from '@/features/import-playlists'
import { CreatePlaylistButton } from '@/features/manage-playlist'
import { LikedCover, PlaylistCard, useLikes, usePlaylists } from '@/entities/library'
import { useMusicServices } from '@/entities/preferences'
import { useSpotifyAccount } from '@/entities/spotify-account'
import { plural, useCachedFetch } from '@/shared/lib'
import { UiButton, UiPageHeader } from '@/shared/ui'

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

// Совсем новая библиотека — подсказываем, с чего начать
const isEmpty = computed(() => !likedCount.value && !playlists.value?.length)
</script>

<template>
  <div class="library">
    <div class="library__head">
      <UiPageHeader title="Библиотека" />
      <div class="library__actions">
        <CreatePlaylistButton />
        <ImportPlaylistsButton />
        <ImportLikesButton />
      </div>
    </div>

    <div class="library__grid">
      <PlaylistCard to="/liked" title="Любимые треки" :subtitle="`${likedCount} ${plural(likedCount, ['трек', 'трека', 'треков'])}`">
        <template #cover>
          <LikedCover />
        </template>
      </PlaylistCard>
      <PlaylistCard
        v-for="p in playlists"
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

  &__heading {
    margin: var(--space-6) 0 var(--space-3);
    font-size: var(--fs-xl);
    font-weight: 700;
    letter-spacing: -0.02em;
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
</style>
