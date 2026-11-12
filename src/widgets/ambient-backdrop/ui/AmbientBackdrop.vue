<script setup lang="ts">
import { usePlayer } from '@/entities/player'

/**
 * Фон всего приложения: сильно размытая обложка текущего трека (или мягкие пятна акцента,
 * если ничего не играет). Цвет берётся самим размытием — без анализа пикселей и CORS.
 */
const props = defineProps<{ cover?: string }>()
const player = usePlayer()
const src = computed(() => props.cover ?? player.current.value?.coverUrl)
</script>

<template>
  <div class="ambient" aria-hidden="true">
    <div class="ambient__blobs" />
    <Transition name="ambient-fade">
      <img v-if="src" :key="src" :src="src" class="ambient__image" alt="">
    </Transition>
    <div class="ambient__veil" />
  </div>
</template>

<style lang="scss" scoped>
.ambient {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: var(--c-bg);
  pointer-events: none;

  &__blobs {
    position: absolute;
    inset: -20%;
    background:
      radial-gradient(40% 35% at 20% 15%, var(--c-accent-soft), transparent 70%),
      radial-gradient(35% 30% at 85% 30%, color-mix(in srgb, var(--c-accent) 10%, transparent), transparent 70%),
      radial-gradient(45% 40% at 60% 95%, var(--c-accent-soft), transparent 70%);
  }

  &__image {
    position: absolute;
    inset: -15%;
    width: 130%;
    height: 130%;
    object-fit: cover;
    opacity: var(--ambient-opacity);
    filter: blur(90px) saturate(1.6);
    transform: translateZ(0); // отдельный слой — размытие не тормозит прокрутку
  }

  // Плавный переход к фону снизу — текст списков остаётся читаемым.
  &__veil {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--c-bg) 55%, transparent) 55%, var(--c-bg) 100%);
  }
}

.ambient-fade-enter-active,
.ambient-fade-leave-active {
  transition: opacity 1.2s var(--ease);
}

.ambient-fade-enter-from,
.ambient-fade-leave-to {
  opacity: 0;
}
</style>
