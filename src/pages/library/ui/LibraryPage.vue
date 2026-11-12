<script setup lang="ts">
import { useCachedFetch } from '@/shared/lib'
import { ImportLikesButton } from '@/features/import-likes'
import { CreatePlaylistButton } from '@/features/manage-playlist'
import { LikedCover, PlaylistCard, useLikes, usePlaylists } from '@/entities/library'
import { useSpotifyAccount } from '@/entities/spotify-account'
import { plural } from '@/shared/lib'
import { UiPageHeader } from '@/shared/ui'

const { data: playlists } = usePlaylists()
const { data: spotify } = useSpotifyAccount()
const { data: spotifyPlaylists, execute: loadSpotifyPlaylists } = useCachedFetch<SpotifyPlaylistInfo[]>('/api/spotify/playlists', {
  key: 'spotify:playlists',
  default: () => [],
  immediate: false,
  ttl: 10 * 60_000,
})
watch(() => spotify.value.connected, (c) => {
  if (c && !spotifyPlaylists.value.length) loadSpotifyPlaylists()
}, { immediate: true })
const likes = useLikes()
const likedCount = computed(() => likes.ids.value.length)
</script>

<template>
  <div class="library">
    <div class="library__head">
      <UiPageHeader title="Библиотека" />
      <div class="library__actions">
        <ImportLikesButton />
        <CreatePlaylistButton />
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

    <template v-if="spotify.connected">
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
