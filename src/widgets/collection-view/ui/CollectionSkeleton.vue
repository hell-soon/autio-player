<script setup lang="ts">
import { UiSkeleton, UiSkeletonRows } from '@/shared/ui'

/** Скелет страницы коллекции (плейлист, альбом, любимое): та же раскладка, что у CollectionView. */
</script>

<template>
  <div class="collection-skeleton">
    <header class="collection-skeleton__header">
      <UiSkeleton width="200px" height="200px" radius="var(--radius-md)" class="collection-skeleton__cover" />
      <div class="collection-skeleton__info">
        <UiSkeleton width="80px" height="12px" />
        <UiSkeleton width="min(360px, 70vw)" height="40px" radius="var(--radius-md)" />
        <UiSkeleton width="180px" height="16px" />
      </div>
    </header>
    <div class="collection-skeleton__toolbar">
      <UiSkeleton width="120px" height="44px" radius="var(--radius-full)" />
      <UiSkeleton width="44px" height="44px" circle />
      <UiSkeleton width="44px" height="44px" circle />
    </div>
    <div class="collection-skeleton__list">
      <UiSkeletonRows :count="8" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.collection-skeleton {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-5);

  &__header {
    display: flex;
    align-items: flex-end;
    gap: var(--space-5);

    @include down(md) {
      flex-direction: column;
      align-items: center;
    }
  }

  &__cover {
    @include down(md) {
      width: 180px !important;
      height: 180px !important;
    }
  }

  &__info {
    display: grid;
    gap: var(--space-2);

    @include down(md) {
      justify-items: center;
    }
  }

  &__toolbar {
    display: flex;
    gap: var(--space-2);

    @include down(md) {
      justify-content: center;
    }
  }

  &__list {
    @include glass;

    padding: var(--space-2);
    border-radius: var(--radius-lg);
  }
}
</style>
