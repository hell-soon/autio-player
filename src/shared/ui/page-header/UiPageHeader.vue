<script setup lang="ts">
defineProps<{ title: string, subtitle?: string }>()
</script>

<template>
  <header class="page-header">
    <h1 class="page-header__title">
      {{ title }}
    </h1>
    <p v-if="subtitle" class="page-header__subtitle">
      {{ subtitle }}
    </p>
  </header>
</template>

<style lang="scss" scoped>
.page-header {
  margin-bottom: var(--space-5);

  &__title {
    font-size: var(--fs-2xl);
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.15;

    @include down(md) {
      font-size: var(--fs-xl);
    }
  }

  &__subtitle {
    margin-top: var(--space-1);
    color: var(--c-text-muted);
  }
}
</style>
