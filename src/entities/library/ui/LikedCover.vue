<script setup lang="ts">
import { Heart } from 'lucide-vue-next'
</script>

<template>
  <div class="liked-cover card-cover">
    <Heart fill="currentColor" />
  </div>
</template>

<style lang="scss" scoped>
.liked-cover {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  background: linear-gradient(140deg, var(--c-accent), color-mix(in oklab, var(--c-accent) 45%, #1d1a35));
  color: var(--c-on-accent);

  svg {
    width: 34%;
    height: 34%;
  }
}
</style>
