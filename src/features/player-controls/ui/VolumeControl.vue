<script setup lang="ts">
import { Volume1, Volume2, VolumeX } from 'lucide-vue-next'
import { usePlayer } from '@/entities/player'
import { UiIconButton, UiSlider } from '@/shared/ui'

const p = usePlayer()
const icon = computed(() => (p.muted.value || p.volume.value === 0 ? VolumeX : p.volume.value < 0.5 ? Volume1 : Volume2))
</script>

<template>
  <div class="volume">
    <UiIconButton :label="p.muted.value ? 'Включить звук' : 'Выключить звук'" size="sm" @click="p.toggleMute()">
      <component :is="icon" />
    </UiIconButton>
    <UiSlider
      class="volume__slider"
      :model-value="p.muted.value ? 0 : p.volume.value"
      :max="1"
      :step="0.01"
      label="Громкость"
      @update:model-value="v => p.setVolume(v)"
    />
  </div>
</template>

<style lang="scss" scoped>
.volume {
  display: flex;
  align-items: center;
  gap: var(--space-1);

  &__slider {
    width: 100px;
  }
}
</style>
