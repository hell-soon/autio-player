<script setup lang="ts">
import { ListMusic } from 'lucide-vue-next'
import { coverOfSize } from '@/shared/lib'

/** Обложка плейлиста: коллаж из 4 обложек, одна обложка или заглушка. */
const props = withDefaults(defineProps<{ covers: string[], size?: number }>(), { size: 160 })
const grid = computed(() => props.covers.length >= 4)
</script>

<template>
  <div class="playlist-cover" :class="{ 'is-grid': grid }" :style="{ '--size': `${size}px` }">
    <template v-if="grid">
      <img v-for="c in covers.slice(0, 4)" :key="c" :src="coverOfSize(c, size / 2)" alt="" loading="lazy">
    </template>
    <img v-else-if="covers[0]" :src="coverOfSize(covers[0], size)" alt="" loading="lazy">
    <ListMusic v-else class="playlist-cover__icon" />
  </div>
</template>

<style lang="scss" scoped>
.playlist-cover {
  display: grid;
  place-items: center;
  width: var(--size);
  max-width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--c-accent-soft), var(--c-surface));
  color: var(--c-accent);

  &.is-grid {
    grid-template-columns: 1fr 1fr;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__icon {
    width: 36%;
    height: 36%;
  }
}
</style>
