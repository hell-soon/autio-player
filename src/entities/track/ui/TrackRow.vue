<script setup lang="ts">
import { formatDuration } from '@/shared/lib'
import { UiCover } from '@/shared/ui'
import ArtistLinks from './ArtistLinks.vue'
import TrackTitleLink from './TrackTitleLink.vue'

withDefaults(defineProps<{
  track: Track
  /** Номер в списке */
  position?: number
  active?: boolean
  playing?: boolean
  /** В альбоме обложки у всех одинаковые — не показываем */
  showCover?: boolean
  showAlbum?: boolean
  showSource?: boolean
}>(), {
  showCover: true,
  showAlbum: true,
  showSource: false,
})

defineEmits<{ play: [] }>()
</script>

<template>
  <div
    class="track-row"
    :class="{ 'is-active': active }"
    role="button"
    tabindex="0"
    :aria-current="active || undefined"
    @click="$emit('play')"
    @keydown.enter.prevent="$emit('play')"
  >
    <span v-if="position !== undefined" class="track-row__num">
      <span v-if="active && playing" class="track-row__eq" aria-label="Играет">
        <i /><i /><i />
      </span>
      <template v-else>{{ position }}</template>
    </span>

    <UiCover v-if="showCover" :src="track.coverUrl" :size="44" />

    <div class="track-row__main">
      <div class="track-row__title">
        <span v-if="track.explicit" class="track-row__badge" title="Ненормативная лексика">E</span>
        <TrackTitleLink :track="track" class="track-row__title-text" />
      </div>
      <div class="track-row__meta">
        <span
          v-if="showSource"
          class="track-row__source"
          :class="`is-${track.source}`"
          :title="track.source === 'spotify' ? 'Spotify' : 'Яндекс Музыка'"
        >{{ track.source === 'spotify' ? 'S' : 'Я' }}</span>
        <ArtistLinks :track="track" class="track-row__artists" />
      </div>
    </div>

    <span v-if="showAlbum && track.album" class="track-row__album">{{ track.album }}</span>

    <div class="track-row__actions" @click.stop @keydown.enter.stop>
      <slot name="actions" />
    </div>

    <span class="track-row__duration">{{ formatDuration(track.durationMs) }}</span>

    <div class="track-row__menu" @click.stop @keydown.enter.stop>
      <slot name="menu" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.track-row {
  @include focus-ring;

  // Длинные плейлисты (сотни треков): строки за пределами экрана браузер не рисует.
  // Безопасно: меню трека телепортируется в body и не обрезается.
  content-visibility: auto;
  contain-intrinsic-size: auto 56px;

  // На тач-экранах тап по строке всегда запускает трек: ссылки (название, исполнители) не перехватывают его.
  // К альбому и исполнителю можно перейти из меню «⋮» и карточки «Сейчас играет».
  @media (pointer: coarse) {
    :deep(a) {
      pointer-events: none;
    }
  }

  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 56px;
  padding: var(--space-1) var(--space-2) var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease);

  @include hover {
    background: var(--c-surface);
  }

  &.is-active {
    background: var(--c-accent-soft);
  }

  &.is-active &__title-text {
    color: var(--c-accent);
  }

  &__num {
    display: grid;
    place-items: center;
    width: 22px;
    flex: none;
    color: var(--c-text-subtle);
    font-size: var(--fs-sm);
    font-variant-numeric: tabular-nums;

    @include down(md) {
      display: none;
    }
  }

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-weight: 500;
  }

  &__title-text {
    @include truncate;
  }

  &__badge {
    display: grid;
    place-items: center;
    flex: none;
    width: 16px;
    height: 16px;
    border-radius: 4px;
    background: var(--c-surface-active);
    color: var(--c-text-muted);
    font-size: 10px;
    font-weight: 700;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__artists {
    @include truncate;
  }

  &__source {
    display: grid;
    place-items: center;
    flex: none;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    color: #fff;
    font-size: 9px;
    font-weight: 800;

    &.is-spotify {
      background: #1db954;
      color: #000;
    }

    &.is-yandex {
      background: #fc3f1d;
    }
  }

  &__album {
    @include truncate;

    flex: 0 1 28%;
    color: var(--c-text-muted);
    font-size: var(--fs-sm);

    @include down(lg) {
      display: none;
    }
  }

  // Лайк виден при наведении, на тач-экранах и если трек уже в любимых.
  &__actions {
    display: flex;
    align-items: center;
    opacity: 0;
    transition: opacity var(--dur-fast);

    &:has(.is-liked) {
      opacity: 1;
    }

    @include down(md) {
      display: none;
    }
  }

  &:hover &__actions,
  &:focus-within &__actions {
    opacity: 1;
  }

  &__duration {
    width: 40px;
    flex: none;
    color: var(--c-text-subtle);
    font-size: var(--fs-sm);
    font-variant-numeric: tabular-nums;
    text-align: right;

    @include down(sm) {
      display: none;
    }
  }

  &__menu {
    display: flex;
  }

  &__eq {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 14px;

    i {
      width: 3px;
      border-radius: 1px;
      background: var(--c-accent);
      animation: eq 0.9s ease-in-out infinite;

      &:nth-child(2) {
        animation-delay: -0.3s;
      }

      &:nth-child(3) {
        animation-delay: -0.6s;
      }
    }
  }
}

@keyframes eq {
  0%,
  100% {
    height: 30%;
  }

  50% {
    height: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .track-row__eq i {
    animation: none;
    height: 60%;
  }
}
</style>
