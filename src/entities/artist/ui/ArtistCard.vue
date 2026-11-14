<script setup lang="ts">
import { UiCover } from '@/shared/ui'

defineProps<{ artist: ArtistInfo }>()
</script>

<template>
  <NuxtLink :to="`/artist/${artist.id}`" class="artist-card">
    <UiCover :src="artist.imageUrl" :size="400" rounded="full" class="artist-card__photo" />
    <span class="artist-card__name">{{ artist.name }}</span>
    <span class="artist-card__sub">Исполнитель</span>
  </NuxtLink>
</template>

<style lang="scss" scoped>
.artist-card {
  @include focus-ring;

  display: grid;
  justify-items: center;
  gap: 2px;
  min-width: 0;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  text-align: center;
  transition: background-color var(--dur-fast) var(--ease), transform 0.2s cubic-bezier(0.3, 1.4, 0.5, 1);

  // Нажатие — карточка чуть «вдавливается»
  &:active {
    transform: scale(0.97);
  }

  @include hover {
    background: var(--c-surface);
  }

  &__photo {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 1;
    margin-bottom: var(--space-2);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
  }

  &__name {
    @include truncate;

    width: 100%;
    font-weight: 600;
  }

  &__sub {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }
}
</style>
