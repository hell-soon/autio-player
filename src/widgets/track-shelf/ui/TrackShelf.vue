<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { usePlayer } from '@/entities/player'
import { TrackCard } from '@/entities/track'
import { UiIconButton } from '@/shared/ui'

/** Горизонтальная лента треков с прокруткой (на главной). Клик ставит всю ленту в очередь. */
const props = defineProps<{ title: string, subtitle?: string, tracks: Track[] }>()
const player = usePlayer()
const scroller = ref<HTMLElement | null>(null)
const canPrev = ref(false)
const canNext = ref(false)

function update() {
  const el = scroller.value
  if (!el) return
  canPrev.value = el.scrollLeft > 4
  canNext.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
}

function scrollBy(dir: 1 | -1) {
  const el = scroller.value
  if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
}

function play(i: number) {
  const t = props.tracks[i]!
  if (player.current.value?.uid === t.uid) player.toggle()
  else player.playQueue(props.tracks, i)
}

onMounted(() => {
  update()
  window.addEventListener('resize', update)
})
onBeforeUnmount(() => window.removeEventListener('resize', update))
watch(() => props.tracks.length, () => nextTick(update))
</script>

<template>
  <section class="shelf">
    <header class="shelf__head">
      <div class="shelf__titles">
        <h2 class="shelf__title">
          {{ title }}
        </h2>
        <p v-if="subtitle" class="shelf__subtitle">
          {{ subtitle }}
        </p>
      </div>
      <div class="shelf__nav">
        <UiIconButton label="Назад" size="sm" variant="filled" :disabled="!canPrev" @click="scrollBy(-1)">
          <ChevronLeft />
        </UiIconButton>
        <UiIconButton label="Вперёд" size="sm" variant="filled" :disabled="!canNext" @click="scrollBy(1)">
          <ChevronRight />
        </UiIconButton>
      </div>
    </header>
    <div ref="scroller" class="shelf__row" @scroll.passive="update">
      <TrackCard
        v-for="(t, i) in tracks"
        :key="t.uid"
        :track="t"
        :active="player.current.value?.uid === t.uid"
        :playing="player.isPlaying.value"
        class="shelf__item"
        @play="play(i)"
      />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.shelf {
  display: grid;
  gap: var(--space-2);
  min-width: 0;

  &__head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-4);
  }

  &__titles {
    min-width: 0;
  }

  &__title {
    @include truncate;

    font-size: var(--fs-xl);
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  &__subtitle {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__nav {
    display: flex;
    gap: var(--space-1);

    @include down(md) {
      display: none;
    }
  }

  &__row {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: clamp(140px, 15%, 200px);
    gap: var(--space-1);
    margin: 0 calc(var(--space-2) * -1);
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    @include down(md) {
      grid-auto-columns: 40%;
      margin: 0 calc(var(--space-4) * -1);
      padding: 0 var(--space-2);
    }
  }

  &__item {
    scroll-snap-align: start;
  }
}
</style>
