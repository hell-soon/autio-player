<script setup lang="ts">
/** Аватар друга: фото или первая буква имени на цветном круге (цвет — от имени, стабильный). */
const props = withDefaults(defineProps<{ name: string, src?: string, size?: number, live?: boolean }>(), { size: 40 })
const failed = ref(false)
const initial = computed(() => props.name.trim()[0]?.toUpperCase() ?? '?')
const hue = computed(() => [...props.name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7))
</script>

<template>
  <span class="avatar" :class="{ 'is-live': live }" :style="{ '--size': `${size}px`, '--hue': hue }">
    <img v-if="src && !failed" :src="src" alt="" loading="lazy" @error="failed = true">
    <span v-else class="avatar__initial" aria-hidden="true">{{ initial }}</span>
  </span>
</template>

<style lang="scss" scoped>
.avatar {
  position: relative;
  display: grid;
  flex: none;
  place-items: center;
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  // Цвет из имени — через hsl от переменной (не «сырой» цвет темы)
  background: hsl(var(--hue) 55% 62%);
  color: var(--c-on-accent);
  font-size: calc(var(--size) * 0.42);
  font-weight: 700;

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  // Слушает прямо сейчас — кольцо акцента
  &.is-live {
    box-shadow: 0 0 0 2px var(--c-bg), 0 0 0 4px var(--c-accent);
  }
}
</style>
