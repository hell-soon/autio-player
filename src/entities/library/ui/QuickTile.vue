<script setup lang="ts">
/** Компактная плитка быстрого доступа (обложка + название) — сетка на главной. */
defineProps<{ to: string, title: string }>()
</script>

<template>
  <NuxtLink :to="to" class="tile">
    <span class="tile__cover"><slot name="cover" /></span>
    <span class="tile__title">{{ title }}</span>
  </NuxtLink>
</template>

<style lang="scss" scoped>
.tile {
  @include focus-ring;
  @include glass;

  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 64px;
  overflow: hidden;
  border-radius: var(--radius-md);
  transition: background-color var(--dur-fast) var(--ease);

  @include hover {
    background: var(--c-panel-strong);
  }

  &__cover {
    flex: none;
    width: 64px;
    height: 64px;

    :deep(> *) {
      width: 100% !important;
      height: 100% !important;
      border-radius: 0 !important;
    }
  }

  &__title {
    @include truncate;

    padding-right: var(--space-3);
    font-weight: 600;
  }
}
</style>
