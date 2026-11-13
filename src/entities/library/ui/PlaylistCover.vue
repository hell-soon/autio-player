<script setup lang="ts">
import { ListMusic } from 'lucide-vue-next'
import { coverOfSize } from '@/shared/lib'

/**
 * Обложка плейлиста: коллаж из 4 обложек, одна обложка или — если обложек нет —
 * сгенерированная: градиент цвета от названия + первые буквы (у каждого плейлиста свой, постоянный).
 */
const props = withDefaults(defineProps<{ covers: string[], size?: number, name?: string }>(), { size: 160 })
const grid = computed(() => props.covers.length >= 4)

const generated = computed(() => {
  const name = props.name?.trim()
  if (!name) return null
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 11)
  const words = name.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w))
  const letters = (words.length > 1 ? words[0]![0]! + words[1]![0]! : name.slice(0, 2)).toUpperCase()
  return { hue, letters }
})
</script>

<template>
  <div class="playlist-cover" :class="{ 'is-grid': grid }" :style="{ '--size': `${size}px` }">
    <template v-if="grid">
      <img v-for="c in covers.slice(0, 4)" :key="c" :src="coverOfSize(c, size / 2)" alt="" loading="lazy">
    </template>
    <img v-else-if="covers[0]" :src="coverOfSize(covers[0], size)" alt="" loading="lazy">
    <span v-else-if="generated" class="playlist-cover__generated" :style="{ '--hue': generated.hue }" aria-hidden="true">
      {{ generated.letters }}
    </span>
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
  container-type: inline-size;
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

  // Сгенерированная обложка: два оттенка от названия, крупные буквы. Цвета — hsl от --hue, не «сырые»
  &__generated {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    background:
      radial-gradient(circle at 80% 15%, hsl(calc(var(--hue) + 40) 80% 70% / 0.9), transparent 55%),
      linear-gradient(140deg, hsl(var(--hue) 65% 52%), hsl(calc(var(--hue) + 60) 60% 30%));
    color: hsl(var(--hue) 100% 97%);
    // Буквы — треть ширины обложки, какой бы она ни была на экране (container query units)
    font-size: 32cqw;
    font-weight: 800;
    letter-spacing: -0.04em;
  }
}
</style>
