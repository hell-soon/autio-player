<script setup lang="ts">
import { artistHref } from '../lib/links'

/** Исполнители через запятую, каждый — ссылка на свою страницу. Клик не запускает трек под ним. */
defineProps<{ track: Track }>()
</script>

<template>
  <span class="artist-links">
    <template v-for="(name, i) in track.artists" :key="`${name}-${i}`">
      <NuxtLink :to="artistHref(track, i)" class="artist-links__link" @click.stop>{{ name }}</NuxtLink><template v-if="i < track.artists.length - 1">, </template>
    </template>
  </span>
</template>

<style lang="scss" scoped>
.artist-links__link {
  color: inherit;
  text-underline-offset: 2px;

  &:hover,
  &:focus-visible {
    color: var(--c-text);
    text-decoration: underline;
    outline: none;
  }
}
</style>
