<script setup lang="ts" generic="T extends string">
defineProps<{
  options: { label: string, value: T }[]
  label: string
}>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="ui-segmented" role="radiogroup" :aria-label="label">
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
  display: inline-flex;
  gap: var(--space-1);
  flex-wrap: wrap;

  &__item {
    @include reset-button;
    @include focus-ring;

    height: 32px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-full);
    background: var(--c-surface);
    font-size: var(--fs-sm);
    font-weight: 500;
    transition: background-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);

    @include hover {
      background: var(--c-surface-hover);
    }

    &.is-active {
      background: var(--c-text);
      color: var(--c-bg);
    }
  }
}
</style>
