<script setup lang="ts">
import PlaylistCover from './PlaylistCover.vue'

defineProps<{ to: string, title: string, subtitle?: string, covers?: string[] }>()
</script>

<template>
  <NuxtLink :to="to" class="card">
    <slot name="cover">
      <PlaylistCover :covers="covers ?? []" :size="400" class="card__cover" />
    </slot>
    <span class="card__title">{{ title }}</span>
    <span v-if="subtitle" class="card__subtitle">{{ subtitle }}</span>
  </NuxtLink>
</template>

<style lang="scss" scoped>
.card {
  @include focus-ring;

  display: grid;
  gap: 2px;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  transition: background-color var(--dur-fast) var(--ease);

  @include hover {
    background: var(--c-surface);
  }

  &__cover,
  :deep(.card-cover) {
    width: 100% !important;
    margin-bottom: var(--space-2);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
  }

  &__title {
    @include truncate;

    font-weight: 600;
  }

  &__subtitle {
    @include truncate;

    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }
}
</style>
