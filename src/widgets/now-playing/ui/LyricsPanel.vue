<script setup lang="ts">
import { usePlayer } from '@/entities/player'
import { UiSpinner } from '@/shared/ui'

/**
 * Текст песни. Синхронизированный — подсвечивает текущую строку и сам прокручивается
 * (пока пользователь не листает вручную); клик по строке — перемотка.
 */
const p = usePlayer()
const box = ref<HTMLElement | null>(null)

const { data: lyrics, status } = useAsyncData(
  'lyrics:current',
  () => (p.current.value ? $fetch<Lyrics | null>('/api/lyrics', { method: 'POST', body: { track: p.current.value } }) : Promise.resolve(null)),
  { watch: [() => p.current.value?.uid], server: false, default: () => null },
)

// Чуть раньше реального времени — строка успевает подсветиться к моменту, когда её поют.
const activeIndex = computed(() => {
  const lines = lyrics.value?.synced
  if (!lines) return -1
  const pos = p.position.value + 250
  let i = -1
  for (let k = 0; k < lines.length; k++) {
    if (lines[k]!.t <= pos) i = k
    else break
  }
  return i
})

let userScrollUntil = 0
function onUserScroll() {
  userScrollUntil = Date.now() + 4000
}

watch(activeIndex, async (i) => {
  if (i < 0 || Date.now() < userScrollUntil) return
  await nextTick()
  const el = box.value?.querySelector<HTMLElement>(`[data-i="${i}"]`)
  const container = box.value
  if (!el || !container) return
  container.scrollTo({ top: el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' })
})
</script>

<template>
  <div ref="box" class="lyrics" @wheel.passive="onUserScroll" @touchmove.passive="onUserScroll">
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

  &__source {
    margin-top: var(--space-4);
    padding: 0 var(--space-2);
    color: var(--c-text-subtle);
    font-size: var(--fs-xs);
  }
}
</style>
