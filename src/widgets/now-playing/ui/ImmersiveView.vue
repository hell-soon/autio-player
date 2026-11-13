<script setup lang="ts">
import { Minimize2 } from 'lucide-vue-next'
import { PlayerControls, PlayerProgress } from '@/features/player-controls'
import { AudioVisualizer, usePlayer } from '@/entities/player'
import { TrackVideo } from '@/entities/track'
import { coverOfSize } from '@/shared/lib'
import { UiCover, UiIconButton } from '@/shared/ui'
import { useCurrentLyrics } from '../model/lyrics'
import LyricsPanel from './LyricsPanel.vue'

/**
 * Полноэкранный режим «Сейчас играет»: крупная обложка (или видеообложка Яндекса),
 * текст песни караоке-строками, визуализатор на весь низ экрана.
 * Управление прячется, пока музыка играет и мышь не двигается, — остаётся только картинка.
 */
const emit = defineEmits<{ exit: [] }>()
const p = usePlayer()
const { lyrics, status } = useCurrentLyrics()

const track = computed(() => p.current.value!)
const showLyrics = computed(() => status.value === 'pending' || !!(lyrics.value?.synced || lyrics.value?.plain))

const idle = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
function wake() {
  idle.value = false
  clearTimeout(timer)
  timer = setTimeout(() => (idle.value = true), 3000)
}
onMounted(wake)
onBeforeUnmount(() => clearTimeout(timer))
const hidden = computed(() => idle.value && p.isPlaying.value)
</script>

<template>
  <div class="imm" :class="{ 'is-idle': hidden, 'has-lyrics': showLyrics }" @pointermove="wake" @pointerdown="wake">
    <div class="imm__bg" aria-hidden="true">
      <Transition name="imm-fade">
        <img v-if="track.coverUrl" :key="track.coverUrl" :src="coverOfSize(track.coverUrl, 100)" alt="">
      </Transition>
    </div>
    <AudioVisualizer v-if="p.visualizer.value" class="imm__viz" />

    <UiIconButton label="Выйти из полноэкранного режима" variant="filled" class="imm__exit" @click="emit('exit')">
      <Minimize2 />
    </UiIconButton>

    <div class="imm__stage">
      <div class="imm__art" :class="{ 'is-paused': !p.isPlaying.value }">
        <UiCover :src="track.coverUrl" :size="720" rounded="md" class="imm__cover" />
        <TrackVideo :track="track" :playing="p.isPlaying.value" class="imm__video" />
      </div>
      <div v-if="showLyrics" class="imm__lyrics">
        <LyricsPanel karaoke />
      </div>
    </div>

    <footer class="imm__dock">
      <div class="imm__meta">
        <span class="imm__title">{{ track.title }}</span>
        <span class="imm__artists">{{ track.artists.join(', ') }}</span>
      </div>
      <PlayerControls class="imm__controls" />
      <PlayerProgress class="imm__progress" />
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.imm {
  position: fixed;
  inset: 0;
  z-index: 5;
  overflow: hidden;
  background: var(--c-bg);
  color: var(--c-text);

  &.is-idle {
    cursor: none;
  }

  &__bg {
    position: absolute;
    inset: 0;

    img {
      position: absolute;
      inset: -20%;
      width: 140%;
      height: 140%;
      object-fit: cover;
      filter: blur(90px) saturate(1.7);
      opacity: 0.7;
    }

    // Затемнение, чтобы текст читался на любой обложке
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, color-mix(in srgb, var(--c-bg) 35%, transparent), color-mix(in srgb, var(--c-bg) 75%, transparent));
    }
  }

  & &__viz {
    position: absolute;
    inset: auto 0 0;
    height: 42vh;
    opacity: 0.45;
    pointer-events: none;
  }

  &__exit {
    position: absolute;
    top: calc(var(--space-4) + env(safe-area-inset-top));
    right: var(--space-4);
    z-index: 2;
  }

  // Обложка | текст. Без текста — одна крупная обложка по центру.
  &__stage {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, min(56vh, 40vw));
    justify-content: center;
    align-items: center;
    gap: 6vw;
    height: 100%; // не 100dvh: в PWA на iPhone он меньше экрана
    padding: 6vh 6vw 22vh;
  }

  &.has-lyrics &__stage {
    grid-template-columns: minmax(0, min(52vh, 34vw)) minmax(0, 46vw);
  }

  &__art {
    position: relative;
    transition: transform 0.6s var(--ease);

    &.is-paused {
      transform: scale(0.95);
    }
  }

  &__cover {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 1;
    border-radius: var(--radius-lg) !important;
    box-shadow: 0 40px 90px rgb(0 0 0 / 0.45);
  }

  & &__video {
    border-radius: var(--radius-lg);
  }

  &__lyrics {
    height: 100%;
    min-height: 0;
  }

  &__dock {
    position: absolute;
    inset: auto 0 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    grid-template-areas: 'meta controls .' 'progress progress progress';
    align-items: center;
    gap: var(--space-2) var(--space-5);
    padding: var(--space-5) 6vw calc(var(--space-5) + env(safe-area-inset-bottom));
    background: linear-gradient(to top, color-mix(in srgb, var(--c-bg) 80%, transparent), transparent);
  }

  &__dock,
  &__exit {
    transition: opacity 0.5s var(--ease), transform 0.5s var(--ease);
  }

  &.is-idle &__dock {
    opacity: 0;
    transform: translateY(12px);
    pointer-events: none;
  }

  &.is-idle &__exit {
    opacity: 0;
    pointer-events: none;
  }

  &__meta {
    display: grid;
    grid-area: meta;
    min-width: 0;
  }

  &__title {
    @include truncate;

    font-size: var(--fs-lg);
    font-weight: 700;
  }

  &__artists {
    @include truncate;

    color: var(--c-text-muted);
  }

  &__controls {
    grid-area: controls;
  }

  &__progress {
    grid-area: progress;
  }

  // Телефон: обложка сверху, текст под ней, управление внизу
  @include down(md) {
    &__stage,
    &.has-lyrics &__stage {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto minmax(0, 1fr);
      align-items: start;
      gap: var(--space-4);
      padding: calc(var(--space-7) + env(safe-area-inset-top)) var(--space-4) 30vh;
    }

    &__art {
      justify-self: center;
      width: min(100%, 44vh);
    }

    &.has-lyrics &__art {
      width: min(52vw, 26vh);
    }

    &__dock {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: 'meta' 'progress' 'controls';
      padding-inline: var(--space-4);
      text-align: center;
    }

    &__controls {
      justify-self: center;
    }
  }
}

.imm-fade-enter-active,
.imm-fade-leave-active {
  transition: opacity 1s var(--ease);
}

.imm-fade-enter-from,
.imm-fade-leave-to {
  opacity: 0;
}
</style>
