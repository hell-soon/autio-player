<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { formatDuration } from '@/shared/lib'
import { UiCover } from '@/shared/ui'
import ArtistLinks from './ArtistLinks.vue'
import TrackTitleLink from './TrackTitleLink.vue'

const props = withDefaults(defineProps<{
  track: Track
  /** Режим выбора нескольких: вместо номера — отметка, нажатие выбирает (событие play) */
  selecting?: boolean
  selected?: boolean
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

const emit = defineEmits<{ play: [] }>()

/**
 * Долгое нажатие (телефон) и правая кнопка мыши (компьютер) открывают то же меню, что «⋮»:
 * «Играть следующим», «В очередь», «В плейлист»… — не нужно целиться в маленькую кнопку.
 */
const row = ref<HTMLElement | null>(null)
const LONG_PRESS_MS = 480
let pressTimer: ReturnType<typeof setTimeout> | undefined
let pressStart: { x: number, y: number } | null = null
let longPressed = false

function openMenu() {
  row.value?.querySelector<HTMLElement>('.track-row__menu button')?.click()
}
function onTouchStart(e: TouchEvent) {
  if (props.selecting) return
  const t = e.touches[0]!
  pressStart = { x: t.clientX, y: t.clientY }
  longPressed = false
  clearTimeout(pressTimer)
  pressTimer = setTimeout(() => {
    longPressed = true
    navigator.vibrate?.(10)
    openMenu()
  }, LONG_PRESS_MS)
}
function onTouchMove(e: TouchEvent) {
  const t = e.touches[0]!
  // Палец поехал — это прокрутка, а не удержание
  if (pressStart && Math.hypot(t.clientX - pressStart.x, t.clientY - pressStart.y) > 10) clearTimeout(pressTimer)
}
function onTouchEnd() {
  clearTimeout(pressTimer)
  pressStart = null
}
function onClick() {
  // После долгого нажатия браузер всё равно шлёт click — трек не запускаем, открыто меню
  if (longPressed) {
    longPressed = false
    return
  }
  emit('play')
}
function onContextMenu(e: MouseEvent) {
  // Правая кнопка мыши — наше меню вместо браузерного (на телефоне contextmenu тоже бывает при удержании)
  e.preventDefault()
  if (!longPressed && !props.selecting) openMenu()
}
onBeforeUnmount(() => clearTimeout(pressTimer))
</script>

<template>
  <div
    ref="row"
    class="track-row"
    :class="{ 'is-active': active, 'is-selecting': selecting, 'is-selected': selected }"
    :role="selecting ? 'checkbox' : 'button'"
    :aria-checked="selecting ? Boolean(selected) : undefined"
    tabindex="0"
    :aria-current="active || undefined"
    @click="onClick"
    @keydown.enter.prevent="$emit('play')"
    @contextmenu="onContextMenu"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
  >
    <span v-if="selecting" class="track-row__check" aria-hidden="true">
      <Check v-if="selected" />
    </span>
    <span v-else-if="position !== undefined" class="track-row__num">
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

    <div v-if="!selecting" class="track-row__menu" @click.stop @keydown.enter.stop>
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
  // Размер содержимого БЕЗ отступов строки (56 − 4 − 4): иначе ещё не отрисованная строка
  // считается на 8 px выше (64), а после отрисовки сжимается — список «прыгает»
  contain-intrinsic-size: auto 48px;
  // Удержание открывает наше меню — без системной лупы/выделения текста на iOS
  -webkit-touch-callout: none;
  user-select: none;

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

  &.is-selected {
    background: var(--c-accent-soft);
  }

  // В режиме выбора ссылки не перехватывают нажатие ни мышью, ни пальцем
  &.is-selecting :deep(a) {
    pointer-events: none;
  }

  &.is-selecting &__actions {
    display: none;
  }

  &__check {
    display: grid;
    place-items: center;
    flex: none;
    width: 22px;
    height: 22px;
    border: 2px solid var(--c-text-subtle);
    border-radius: 50%;
    color: var(--c-on-accent);
    transition: background-color var(--dur-fast), border-color var(--dur-fast);

    svg {
      width: 14px;
      height: 14px;
      stroke-width: 3;
    }
  }

  &.is-selected &__check {
    border-color: var(--c-accent);
    background: var(--c-accent);
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
