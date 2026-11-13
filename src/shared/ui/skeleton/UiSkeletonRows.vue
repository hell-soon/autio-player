<script setup lang="ts">
import UiSkeleton from './UiSkeleton.vue'

/** Заглушка списка треков: обложка + две строки, ширина строк слегка «гуляет», как у настоящих названий. */
withDefaults(defineProps<{ count?: number, cover?: boolean }>(), { count: 8, cover: true })
const widths = ['62%', '48%', '71%', '55%', '66%', '40%', '58%', '69%']
</script>

<template>
  <div class="ui-skeleton-rows" role="status" aria-label="Загрузка">
    <div v-for="i in count" :key="i" class="ui-skeleton-rows__row">
      <UiSkeleton v-if="cover" width="44px" height="44px" />
      <div class="ui-skeleton-rows__text">
        <UiSkeleton :width="widths[i % widths.length]" height="14px" />
        <UiSkeleton :width="`calc(${widths[(i + 3) % widths.length]} - 18%)`" height="12px" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ui-skeleton-rows {
  display: grid;
  gap: 2px;

  &__row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: 56px;
    padding: var(--space-1) var(--space-3);
  }

  &__text {
    display: grid;
    flex: 1;
    gap: 8px;
  }
}
</style>
