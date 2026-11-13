<script setup lang="ts">
import { Music } from 'lucide-vue-next'
import { coverOfSize } from '../../lib/cover-size'

const props = withDefaults(defineProps<{
  src?: string
  size?: number
  rounded?: 'sm' | 'md' | 'full'
  alt?: string
}>(), {
  size: 48,
  rounded: 'sm',
  alt: '',
})

const failed = ref(false)
// Картинка под размер на экране (у Яндекса CDN отдаёт нужный размер)
const sized = computed(() => coverOfSize(props.src, props.size))
watch(() => props.src, () => (failed.value = false))
</script>

<template>
  <div class="ui-cover" :class="`ui-cover--${rounded}`" :style="{ width: `${size}px`, height: `${size}px` }">
    <img v-if="src && !failed" :src="sized" :alt="alt" loading="lazy" decoding="async" @error="failed = true">
    <Music v-else class="ui-cover__placeholder" />
  </div>
</template>

<style lang="scss" scoped>
.ui-cover {
  display: grid;
  place-items: center;
  flex: none;
  overflow: hidden;
  background: var(--c-surface);
  color: var(--c-text-subtle);

  &--sm {
    border-radius: var(--radius-sm);
  }

  &--md {
    border-radius: var(--radius-md);
  }

  &--full {
    border-radius: 50%;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__placeholder {
    width: 40%;
    height: 40%;
  }
}
</style>
