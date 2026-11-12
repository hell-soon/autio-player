<script setup lang="ts">
defineProps<{ title: string, text?: string }>()
</script>

<template>
  <div class="ui-empty">
    <div v-if="$slots.icon" class="ui-empty__icon">
      <slot name="icon" />
    </div>
    <h3 class="ui-empty__title">
      {{ title }}
    </h3>
    <p v-if="text" class="ui-empty__text">
      {{ text }}
    </p>
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.ui-empty {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  padding: var(--space-7) var(--space-4);
  text-align: center;

  &__icon {
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    margin-bottom: var(--space-2);
    border-radius: 50%;
    background: var(--c-accent-soft);
    color: var(--c-accent);

    :deep(svg) {
      width: 26px;
      height: 26px;
    }
  }

  &__title {
    font-size: var(--fs-lg);
    font-weight: 700;
  }

  &__text {
    max-width: 360px;
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }
}
</style>
