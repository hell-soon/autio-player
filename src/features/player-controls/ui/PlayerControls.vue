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
    <UiIconButton v-if="!compact" label="Предыдущий" :size="size" @click="p.previous()">
      <SkipBack fill="currentColor" />
    </UiIconButton>
    <UiIconButton
      :label="p.isPlaying.value ? 'Пауза' : 'Играть'"
      variant="accent"
      :size="size === 'lg' ? 'lg' : 'md'"
      class="controls__play"
      @click="p.toggle()"
    >
      <UiSpinner v-if="p.buffering.value && !p.isPlaying.value" />
      <Pause v-else-if="p.isPlaying.value" fill="currentColor" />
      <Play v-else fill="currentColor" class="controls__play-icon" />
    </UiIconButton>
    <UiIconButton label="Следующий" :size="size" @click="p.next()">
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

  // Треугольник «play» визуально смещён влево — компенсируем.
  &__play-icon {
    margin-left: 2px;
  }
}
</style>
