<script setup lang="ts">
import { Radio } from 'lucide-vue-next'
import { usePlayer } from '@/entities/player'
import { UiCover } from '@/shared/ui'

/** «Ваши исполнители» (топ Spotify): клик — радио по исполнителю из Яндекса. */
defineProps<{ artists: SpotifyArtistInfo[] }>()
const p = usePlayer()
const active = computed(() => (p.radioSource.value?.station === 'artist' ? p.radioSource.value.name : null))
</script>

<template>
  <div class="artists">
    <button
      v-for="a in artists"
      :key="a.id"
      type="button"
      class="artist"
      :class="{ 'is-active': active === a.name }"
      :title="`Радио: ${a.name}`"
      @click="p.startRadio({ station: 'artist', name: a.name })"
    >
      <span class="artist__photo">
        <UiCover :src="a.imageUrl" :size="128" rounded="full" />
        <span class="artist__badge"><Radio /></span>
      </span>
      <span class="artist__name">{{ a.name }}</span>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.artists {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 128px;
  gap: var(--space-3);
  margin: 0 calc(var(--space-2) * -1);
  padding: 0 var(--space-2);
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @include down(md) {
    grid-auto-columns: 100px;
  }
}

.artist {
  @include reset-button;
  @include focus-ring;

  display: grid;
  justify-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  border-radius: var(--radius-md);
  text-align: center;

  &__photo {
    position: relative;
    width: 100%;

    :deep(.ui-cover) {
      width: 100% !important;
      height: auto !important;
      aspect-ratio: 1;
      box-shadow: 0 8px 24px rgb(0 0 0 / 0.2);
      transition: transform var(--dur) var(--ease);
    }
  }

  @include hover {
    :deep(.ui-cover) {
      transform: scale(1.04);
    }
  }

  &__badge {
    position: absolute;
    right: 4px;
    bottom: 4px;
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--c-accent);
    color: var(--c-on-accent);
    opacity: 0;
    transition: opacity var(--dur);

    svg {
      width: 16px;
      height: 16px;
    }
  }

  &:hover &__badge,
  &.is-active &__badge {
    opacity: 1;
  }

  &.is-active &__name {
    color: var(--c-accent);
  }

  &__name {
    @include truncate;

    width: 100%;
    font-size: var(--fs-sm);
    font-weight: 600;
  }
}
</style>
