<script setup lang="ts">
import { heroCover } from '@/shared/lib'
import { UiCover } from '@/shared/ui'

defineProps<{ album: AlbumInfo, /** Своя подпись вместо «год · исполнители» */ subtitle?: string }>()
</script>

<template>
  <NuxtLink :to="`/album/${album.id}`" class="album-card" @click="heroCover">
    <UiCover :src="album.coverUrl" :size="400" rounded="md" class="album-card__cover" />
    <span class="album-card__title">{{ album.title }}</span>
    <span class="album-card__sub">{{ subtitle ?? [album.year, album.artists.join(', ')].filter(Boolean).join(' · ') }}</span>
  </NuxtLink>
</template>

<style lang="scss" scoped>
.album-card {
  @include focus-ring;

  display: grid;
  gap: 2px;
  min-width: 0;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  transition: background-color var(--dur-fast) var(--ease), transform 0.2s cubic-bezier(0.3, 1.4, 0.5, 1);

  // Нажатие — карточка чуть «вдавливается»
  &:active {
    transform: scale(0.97);
  }

  @include hover {
    background: var(--c-surface);
  }

  &__cover {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 1;
    margin-bottom: var(--space-2);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
  }

  &__title {
    @include truncate;

    font-weight: 600;
  }

  &__sub {
    @include truncate;

    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }
}
</style>
