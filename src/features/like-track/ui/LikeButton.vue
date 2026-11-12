<script setup lang="ts">
import { Heart } from 'lucide-vue-next'
import { useLikes } from '@/entities/library'
import { UiIconButton } from '@/shared/ui'

const props = withDefaults(defineProps<{ track: Track, size?: 'sm' | 'md' | 'lg' }>(), { size: 'sm' })
const likes = useLikes()
const liked = computed(() => likes.isLiked(props.track.uid))
</script>

<template>
  <UiIconButton
    class="like-button"
    :class="{ 'is-liked': liked }"
    :size="size"
    :label="liked ? 'Убрать из любимых' : 'В любимые'"
    :active="liked"
    @click.stop="likes.toggle(track)"
  >
    <Heart :fill="liked ? 'currentColor' : 'none'" />
  </UiIconButton>
</template>

<style lang="scss" scoped>
.like-button.is-liked :deep(svg) {
  animation: pop 0.3s var(--ease);
}

@keyframes pop {
  50% {
    transform: scale(1.25);
  }
}
</style>
