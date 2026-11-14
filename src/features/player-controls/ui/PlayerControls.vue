<script setup lang="ts">
import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-vue-next'
import { usePlayer } from '@/entities/player'
import { UiIconButton, UiSpinner } from '@/shared/ui'

/** Кнопки управления: используются в нижнем плеере и в полноэкранной карточке. */
withDefaults(defineProps<{ size?: 'md' | 'lg', compact?: boolean }>(), { size: 'md' })
const p = usePlayer()
const repeatLabel = computed(() => ({ off: 'Повтор выключен', all: 'Повтор очереди', one: 'Повтор трека' })[p.repeat.value])
</script>

<template>
  <div class="controls" :class="`controls--${size}`">
    <UiIconButton v-if="!compact" label="Перемешать" :active="p.shuffle.value" size="sm" @click="p.toggleShuffle()">
      <Shuffle />
    </UiIconButton>
    <UiIconButton v-if="!compact" label="Предыдущий" :size="size" class="controls__skip is-back" @click="p.previous()">
      <SkipBack fill="currentColor" />
    </UiIconButton>
    <UiIconButton
      :label="p.isPlaying.value ? 'Пауза' : 'Играть'"
      variant="accent"
      :size="size === 'lg' ? 'lg' : 'md'"
      class="controls__play"
      @click="p.toggle()"
    >
      <!-- Значки сменяют друг друга с поворотом и масштабом (в одной ячейке — без скачка) -->
      <span class="controls__swap">
        <Transition name="icon-swap">
          <UiSpinner v-if="p.buffering.value && !p.isPlaying.value" key="spin" />
          <Pause v-else-if="p.isPlaying.value" key="pause" fill="currentColor" />
          <Play v-else key="play" fill="currentColor" class="controls__play-icon" />
        </Transition>
      </span>
    </UiIconButton>
    <UiIconButton label="Следующий" :size="size" class="controls__skip" @click="p.next()">
      <SkipForward fill="currentColor" />
    </UiIconButton>
    <UiIconButton v-if="!compact" :label="repeatLabel" :active="p.repeat.value !== 'off'" size="sm" @click="p.cycleRepeat()">
      <Repeat1 v-if="p.repeat.value === 'one'" />
      <Repeat v-else />
    </UiIconButton>
  </div>
</template>

<style lang="scss" scoped>
.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);

  &--lg {
    gap: var(--space-4);
  }

  &--lg &__play {
    width: 64px;
    height: 64px;
  }

  // На всю кнопку: размер значка у UiIconButton задан в процентах от родителя
  &__swap {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;

    > * {
      grid-area: 1 / 1;
    }
  }

  // Нажатие «вперёд/назад» — значок коротко сдвигается в сторону перехода
  &__skip:active :deep(svg) {
    transform: translateX(3px);
  }

  &__skip.is-back:active :deep(svg) {
    transform: translateX(-3px);
  }

  &__skip :deep(svg) {
    transition: transform var(--dur-fast) var(--ease);
  }

  // Треугольник «play» визуально смещён влево — компенсируем.
  &__play-icon {
    margin-left: 2px;
  }
}
.icon-swap-enter-active,
.icon-swap-leave-active {
  transition: opacity 0.2s var(--ease), transform 0.28s cubic-bezier(0.3, 1.4, 0.5, 1);
}

.icon-swap-enter-from {
  opacity: 0;
  transform: scale(0.4) rotate(-90deg);
}

.icon-swap-leave-to {
  opacity: 0;
  transform: scale(0.4) rotate(90deg);
}
</style>
