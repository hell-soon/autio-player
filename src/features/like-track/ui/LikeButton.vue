<script setup lang="ts">
import { Heart } from 'lucide-vue-next'
import { useLikes } from '@/entities/library'
import { UiIconButton } from '@/shared/ui'

const props = withDefaults(defineProps<{ track: Track, size?: 'sm' | 'md' | 'lg' }>(), { size: 'sm' })
const likes = useLikes()
const liked = computed(() => likes.isLiked(props.track.uid))
// Анимация — только по нажатию (а не у каждого лайкнутого трека при открытии списка)
const burst = ref(0)
const unliked = ref(0)
function onClick() {
  if (liked.value) unliked.value++
  else burst.value++
  likes.toggle(props.track)
}
</script>

<template>
  <UiIconButton
    class="like-button"
    :class="{ 'is-liked': liked, 'is-popping': burst && liked }"
    :size="size"
    :label="liked ? 'Убрать из любимых' : 'В любимые'"
    :active="liked"
    @click.stop="onClick"
  >
    <Heart :key="`${burst}-${unliked}`" :fill="liked ? 'currentColor' : 'none'" :class="{ 'is-shrink': unliked && !liked }" />
    <span v-if="burst && liked" :key="burst" class="like-button__burst" aria-hidden="true">
      <i v-for="n in 6" :key="n" :style="{ '--a': `${n * 60}deg` }" />
    </span>
  </UiIconButton>
</template>

<style lang="scss" scoped>
.like-button {
  position: relative;
  overflow: visible;

  &.is-popping :deep(svg) {
    animation: like-pop 0.45s cubic-bezier(0.3, 1.6, 0.5, 1);
  }

  :deep(svg.is-shrink) {
    animation: like-shrink 0.25s var(--ease);
  }

  // Точки разлетаются от сердечка
  &__burst {
    position: absolute;
    inset: 0;
    pointer-events: none;

    i {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 4px;
      height: 4px;
      margin: -2px;
      border-radius: 50%;
      background: var(--c-accent);
      animation: like-dot 0.55s cubic-bezier(0.2, 0.6, 0.3, 1) forwards;
    }
  }
}

@keyframes like-pop {
  0% {
    transform: scale(0.6);
  }

  50% {
    transform: scale(1.25);
  }
}

@keyframes like-shrink {
  50% {
    transform: scale(0.75);
  }
}

@keyframes like-dot {
  0% {
    opacity: 1;
    transform: rotate(var(--a)) translateY(0) scale(1);
  }

  100% {
    opacity: 0;
    transform: rotate(var(--a)) translateY(-18px) scale(0.4);
  }
}
</style>
