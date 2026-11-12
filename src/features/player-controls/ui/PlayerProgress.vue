<script setup lang="ts">
import { usePlayer } from '@/entities/player'
import { formatDuration } from '@/shared/lib'
import { UiSlider } from '@/shared/ui'

defineProps<{ stacked?: boolean }>()
const p = usePlayer()
// Во время перетаскивания показываем позицию ползунка, а не плеера.
const dragPos = ref<number | null>(null)
const shown = computed(() => dragPos.value ?? p.position.value)
</script>

<template>
  <div class="progress" :class="{ 'is-stacked': stacked }">
    <span class="progress__time">{{ formatDuration(shown) }}</span>
    <UiSlider
      class="progress__slider"
      :model-value="p.position.value"
      :max="p.duration.value"
      :step="1000"
      label="Позиция трека"
      @dragging="v => (dragPos = v)"
      @commit="v => p.seek(v)"
    />
    <span class="progress__time">{{ formatDuration(p.duration.value) }}</span>
  </div>
</template>

<style lang="scss" scoped>
.progress {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;

  &__time {
    width: 40px;
    flex: none;
    color: var(--c-text-subtle);
    font-size: var(--fs-xs);
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  // Время под полосой — в полноэкранной карточке.
  &.is-stacked {
    display: grid;
    grid-template: 'bar bar' auto 'a b' auto / 1fr 1fr;
    gap: 0;
  }

  &.is-stacked &__slider {
    grid-area: bar;
  }

  &.is-stacked &__time {
    width: auto;
    text-align: left;

    &:last-child {
      text-align: right;
    }
  }
}
</style>
