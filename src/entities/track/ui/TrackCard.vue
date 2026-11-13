<script setup lang="ts">
import { Pause, Play } from 'lucide-vue-next'
import { UiCover } from '@/shared/ui'
import ArtistLinks from './ArtistLinks.vue'

/** Квадратная карточка трека для лент на главной. */
defineProps<{ track: Track, active?: boolean, playing?: boolean }>()
defineEmits<{ play: [] }>()
</script>

<template>
  <div
    class="track-card"
    :class="{ 'is-active': active }"
    role="button"
    tabindex="0"
    @click="$emit('play')"
    @keydown.enter.prevent="$emit('play')"
  >
    <span class="track-card__cover-wrap">
      <UiCover :src="track.coverUrl" :size="400" rounded="md" class="track-card__cover" />
      <span class="track-card__play" aria-hidden="true">
        <Pause v-if="active && playing" fill="currentColor" />
        <Play v-else fill="currentColor" />
      </span>
    </span>
    <span class="track-card__title">{{ track.title }}</span>
    <ArtistLinks :track="track" class="track-card__artists" />
  </div>
</template>

<style lang="scss" scoped>
.track-card {
  @include focus-ring;

  @media (pointer: coarse) {
    :deep(a) {
      pointer-events: none;
    }
  }

  cursor: pointer;

  display: grid;
  gap: 2px;
  min-width: 0;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  text-align: left;
  transition: background-color var(--dur-fast) var(--ease);

  @include hover {
    background: var(--c-surface);
  }

  &__cover-wrap {
    position: relative;
    margin-bottom: var(--space-2);
  }

  &__cover {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 1;
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
  }

  &__play {
    position: absolute;
    right: var(--space-2);
    bottom: var(--space-2);
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--c-accent);
    color: var(--c-on-accent);
    box-shadow: 0 6px 16px rgb(0 0 0 / 0.3);
    opacity: 0;
    transform: translateY(6px);
    transition: opacity var(--dur) var(--ease), transform var(--dur) var(--ease);

    svg {
      width: 18px;
      height: 18px;
    }
  }

  &:hover &__play,
  &:focus-visible &__play,
  &.is-active &__play {
    opacity: 1;
    transform: none;
  }

  &.is-active &__title {
    color: var(--c-accent);
  }

  &__title {
    @include truncate;

    font-weight: 600;
  }

  &__artists {
    @include truncate;

    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }
}
</style>
