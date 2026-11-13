<script setup lang="ts">
/**
 * Слайдер на нативном input[type=range] (доступность и тач «из коробки»).
 * Во время перетаскивания показывает локальное значение и шлёт `commit` при отпускании —
 * так перемотка не дёргает плеер на каждый пиксель.
 */
const props = withDefaults(defineProps<{
  modelValue: number
  max: number
  step?: number
  label: string
  disabled?: boolean
}>(), {
  step: 1,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
  'commit': [value: number]
  'dragging': [value: number | null]
}>()

const dragValue = ref<number | null>(null)
const value = computed(() => dragValue.value ?? props.modelValue)
const percent = computed(() => (props.max > 0 ? Math.min(100, (value.value / props.max) * 100) : 0))

function onInput(e: Event) {
  dragValue.value = Number((e.target as HTMLInputElement).value)
  emit('dragging', dragValue.value)
  emit('update:modelValue', dragValue.value)
}

function onChange(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  dragValue.value = null
  emit('dragging', null)
  emit('commit', v)
}
</script>

<template>
  <input
    class="ui-slider"
    type="range"
    min="0"
    :max="max || 0"
    :step="step"
    :value="value"
    :aria-label="label"
    :disabled="disabled"
    :style="{ '--percent': `${percent}%` }"
    @input="onInput"
    @change="onChange"
  >
</template>

<style lang="scss" scoped>
$track: 4px;
$thumb: 12px;

.ui-slider {
  appearance: none;
  width: 100%;
  height: $thumb + 8px;
  margin: 0;

  // На тач-экранах полоса выше (видимая дорожка та же) — пальцем легко попасть и тянуть
  @media (pointer: coarse) {
    height: 32px;
  }
  background: transparent;
  cursor: pointer;

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }

  &:focus-visible {
    outline: none;

    &::-webkit-slider-thumb {
      box-shadow: 0 0 0 4px var(--c-accent-soft);
    }
  }

  @mixin track {
    height: $track;
    border-radius: var(--radius-full);
    background: linear-gradient(
      to right,
      var(--c-text) 0 var(--percent),
      var(--c-surface-active) var(--percent) 100%
    );
  }

  @mixin thumb {
    width: $thumb;
    height: $thumb;
    border: 0;
    border-radius: 50%;
    background: var(--c-text);
    opacity: 0;
    transition: opacity var(--dur-fast);
  }

  &::-webkit-slider-runnable-track {
    @include track;
  }

  &::-moz-range-track {
    @include track;
  }

  &::-webkit-slider-thumb {
    appearance: none;
    margin-top: calc(($track - $thumb) / 2);
    @include thumb;
  }

  &::-moz-range-thumb {
    @include thumb;
  }

  // Акцентная заливка и ползунок — при наведении/перетаскивании, как в привычных плеерах.
  &:hover,
  &:active,
  &:focus-visible {
    &::-webkit-slider-runnable-track {
      background: linear-gradient(to right, var(--c-accent) 0 var(--percent), var(--c-surface-active) var(--percent) 100%);
    }

    &::-moz-range-track {
      background: linear-gradient(to right, var(--c-accent) 0 var(--percent), var(--c-surface-active) var(--percent) 100%);
    }

    &::-webkit-slider-thumb {
      opacity: 1;
    }

    &::-moz-range-thumb {
      opacity: 1;
    }
  }

  // На тач-экранах ползунок виден всегда.
  @media (pointer: coarse) {
    &::-webkit-slider-thumb {
      opacity: 1;
    }

    &::-moz-range-thumb {
      opacity: 1;
    }
  }
}
</style>
