<script setup lang="ts">
import { albumHref } from '../lib/links'

/** Название трека — ссылка на альбом (если альбом известен). */
const props = defineProps<{ track: Track }>()
const href = computed(() => albumHref(props.track))
</script>

<template>
  <NuxtLink v-if="href" :to="href" class="title-link" @click.stop>
    <slot>{{ track.title }}</slot>
  </NuxtLink>
  <span v-else><slot>{{ track.title }}</slot></span>
</template>

<style lang="scss" scoped>
.title-link {
  color: inherit;
  text-underline-offset: 2px;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    outline: none;
  }
}
</style>
