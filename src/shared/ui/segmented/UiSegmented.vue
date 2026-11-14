<script setup lang="ts" generic="T extends string">
const props = defineProps<{
  options: { label: string, value: T }[]
  label: string
}>()
const model = defineModel<T>({ required: true })

/**
 * Выделение «переезжает» к выбранному пункту. Пока не измерено (SSR, первый кадр) —
 * подсвечен сам пункт, как раньше.
 */
const root = ref<HTMLElement | null>(null)
const pill = ref<{ x: number, y: number, w: number, h: number } | null>(null)
const animate = ref(false)
function measure() {
  const el = root.value?.querySelector<HTMLElement>('.is-active')
  pill.value = el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null
}
let ro: ResizeObserver | undefined
onMounted(() => {
  measure()
  // Первое положение — без анимации, дальше — с ней
  requestAnimationFrame(() => (animate.value = true))
  ro = new ResizeObserver(measure)
  if (root.value) ro.observe(root.value)
})
onBeforeUnmount(() => ro?.disconnect())
watch([model, () => props.options.length], () => nextTick(measure))
</script>

<template>
  <div ref="root" class="ui-segmented" :class="{ 'has-pill': pill, 'is-animated': animate }" role="radiogroup" :aria-label="label">
    <span
      v-if="pill"
      class="ui-segmented__pill"
      aria-hidden="true"
      :style="{ width: `${pill.w}px`, height: `${pill.h}px`, transform: `translate(${pill.x}px, ${pill.y}px)` }"
    />
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="radio"
      class="ui-segmented__item"
      :class="{ 'is-active': model === o.value }"
      :aria-checked="model === o.value"
      @click="model = o.value"
    >
      {{ o.label }}
    </button>
  </div>
</template>

<style lang="scss" scoped>
.ui-segmented {
  position: relative;
  display: inline-flex;
  gap: var(--space-1);
  flex-wrap: wrap;

  &__pill {
    position: absolute;
    top: 0;
    left: 0;
    border-radius: var(--radius-full);
    background: var(--c-text);
    pointer-events: none;
  }

  &.is-animated &__pill {
    transition:
      transform 0.32s cubic-bezier(0.3, 1.3, 0.5, 1),
      width 0.32s cubic-bezier(0.3, 1.3, 0.5, 1);
  }

  &__item {
    @include reset-button;
    @include focus-ring;

    position: relative;
    height: 32px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-full);
    background: var(--c-surface);
    font-size: var(--fs-sm);
    font-weight: 500;
    transition: background-color var(--dur-fast) var(--ease), color 0.25s var(--ease), transform var(--dur-fast) var(--ease);

    @include hover {
      background: var(--c-surface-hover);
    }

    &:active {
      transform: scale(0.95);
    }

    &.is-active {
      background: var(--c-text);
      color: var(--c-bg);
    }
  }

  // Выделение рисует «пилюля» — у пунктов только текст поверх неё
  &.has-pill &__item.is-active {
    background: transparent;
  }
}
</style>
