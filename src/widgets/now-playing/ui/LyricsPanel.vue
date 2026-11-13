<script setup lang="ts">
import { usePlayer } from '@/entities/player'
import { UiSpinner } from '@/shared/ui'
import { useCurrentLyrics } from '../model/lyrics'

/**
 * Текст песни. Синхронизированный — подсвечивает текущую строку и сам прокручивается
 * (пока пользователь не листает вручную); клик по строке — перемотка.
 */
const props = defineProps<{
  /** Караоке: крупные строки на весь экран (полноэкранный режим) */
  karaoke?: boolean
}>()
const p = usePlayer()
const box = ref<HTMLElement | null>(null)
const { lyrics, status, activeIndex } = useCurrentLyrics()

let userScrollUntil = 0
function onUserScroll() {
  userScrollUntil = Date.now() + 4000
}

async function scrollToActive(behavior: ScrollBehavior) {
  const i = activeIndex.value
  if (i < 0 || Date.now() < userScrollUntil) return
  await nextTick()
  const el = box.value?.querySelector<HTMLElement>(`[data-i="${i}"]`)
  const container = box.value
  if (!el || !container) return
  // В караоке текущая строка — на трети высоты: видно, что поётся дальше
  const anchor = props.karaoke ? container.clientHeight / 3 : container.clientHeight / 2
  container.scrollTo({ top: el.offsetTop - anchor + el.clientHeight / 2, behavior })
}

watch(activeIndex, () => scrollToActive('smooth'))
// Открыли посреди песни — сразу к текущей строке, без долгой прокрутки
watch(() => lyrics.value?.synced, () => scrollToActive('instant'), { flush: 'post' })
onMounted(() => scrollToActive('instant'))
</script>

<template>
  <div ref="box" class="lyrics" :class="{ 'lyrics--karaoke': karaoke }" @wheel.passive="onUserScroll" @touchmove.passive="onUserScroll">
    <div v-if="status === 'pending'" class="lyrics__state">
      <UiSpinner />
    </div>
    <template v-else-if="lyrics?.synced">
      <button
        v-for="(l, i) in lyrics.synced"
        :key="i"
        type="button"
        class="lyrics__line"
        :class="{ 'is-active': i === activeIndex, 'is-past': i < activeIndex, 'is-gap': !l.text }"
        :data-i="i"
        @click="p.seek(l.t)"
      >
        {{ l.text || '♪' }}
      </button>
      <p class="lyrics__source">
        Текст: {{ lyrics.source }}
      </p>
    </template>
    <template v-else-if="lyrics?.plain">
      <p class="lyrics__plain">
        {{ lyrics.plain }}
      </p>
      <p class="lyrics__source">
        Текст: {{ lyrics.source }}
      </p>
    </template>
    <p v-else class="lyrics__state">
      Текст для этой песни не найден
    </p>
  </div>
</template>

<style lang="scss" scoped>
.lyrics {
  @include glass;

  position: relative;
  max-height: min(340px, 36dvh);
  padding: var(--space-4) var(--space-3);
  overflow-y: auto;
  border-radius: var(--radius-lg);
  scrollbar-width: none;
  // Затухание сверху и снизу
  mask-image: linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent);

  &::-webkit-scrollbar {
    display: none;
  }

  &__state {
    display: grid;
    place-items: center;
    padding: var(--space-6) 0;
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__line {
    @include reset-button;

    display: block;
    width: 100%;
    padding: 6px var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--c-text-subtle);
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: -0.01em;
    text-align: left;
    transition: color 0.3s var(--ease), transform 0.3s var(--ease), opacity 0.3s;
    transform-origin: left center;

    @include hover {
      color: var(--c-text-muted);
    }

    &.is-past {
      opacity: 0.6;
    }

    &.is-active {
      color: var(--c-text);
      opacity: 1;
      transform: scale(1.03);
    }

    &.is-gap {
      font-size: var(--fs-md);
    }
  }

  &__plain {
    color: var(--c-text-muted);
    white-space: pre-line;
    line-height: 1.6;
  }

  // Караоке: без панели, крупно, текущая строка яркая, остальные приглушены
  &--karaoke {
    max-height: none;
    height: 100%;
    padding: 30vh var(--space-2) 50vh;
    border: 0;
    background: none;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    mask-image: linear-gradient(to bottom, transparent, #000 18%, #000 75%, transparent);
  }

  &--karaoke &__line {
    padding: 0.3em 0;
    font-size: clamp(1.5rem, 3.2vw, 3rem);
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: -0.02em;
    opacity: 0.32;
    filter: blur(0.6px);
    transition: opacity 0.45s var(--ease), transform 0.45s var(--ease), filter 0.45s, color 0.45s;

    &.is-past {
      opacity: 0.22;
    }

    &.is-active {
      opacity: 1;
      filter: none;
      transform: scale(1.04);
    }

    @include down(md) {
      font-size: 1.6rem;
    }
  }

  &--karaoke &__state,
  &--karaoke &__plain {
    font-size: var(--fs-lg);
  }

  &__source {
    margin-top: var(--space-4);
    padding: 0 var(--space-2);
    color: var(--c-text-subtle);
    font-size: var(--fs-xs);
  }
}
</style>
