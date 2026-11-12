<script setup lang="ts">
import { Pause, Play } from 'lucide-vue-next'
import { usePlayer } from '@/entities/player'
import { UiSpinner, useToast } from '@/shared/ui'
import { DIVERSITY, MOODS, useWaveSettings, type WaveDiversity, type WaveMood } from '../model/wave-settings'

/** «Моя волна» с настройкой настроения и характера: бесконечный поток рекомендаций Яндекса. */
defineProps<{ disabled?: boolean }>()
const p = usePlayer()
const toast = useToast()
const { mood, diversity, apply } = useWaveSettings()
const onWave = computed(() => p.radioStation.value === 'wave')

function play() {
  if (onWave.value) p.toggle()
  else p.startWave()
}

async function choose(kind: 'mood' | 'diversity', value: string) {
  if (kind === 'mood') mood.value = value as WaveMood
  else diversity.value = value as WaveDiversity
  try {
    await apply()
    // Волна уже играет — перезапускаем с новыми настройками.
    if (onWave.value) p.startWave()
  }
  catch {
    toast.error('Не удалось изменить настройки волны')
  }
}
</script>

<template>
  <div class="wave" :class="{ 'is-playing': onWave && p.isPlaying.value, 'is-disabled': disabled }">
    <span class="wave__rings" aria-hidden="true"><i /><i /><i /></span>

    <div class="wave__top">
      <div class="wave__text">
        <h2 class="wave__title">
          Моя волна
        </h2>
        <p class="wave__sub">
          {{ disabled ? 'Подключите Яндекс Музыку в настройках' : 'Бесконечный поток под ваш вкус' }}
        </p>
      </div>
      <button type="button" class="wave__btn" :disabled="disabled" :aria-label="onWave && p.isPlaying.value ? 'Пауза' : 'Включить «Мою волну»'" @click="play">
        <UiSpinner v-if="p.radioLoading.value && !p.isPlaying.value" />
        <Pause v-else-if="onWave && p.isPlaying.value" fill="currentColor" />
        <Play v-else fill="currentColor" />
      </button>
    </div>

    <div v-if="!disabled" class="wave__settings">
      <div class="wave__group" role="radiogroup" aria-label="Настроение">
        <button
          v-for="m in MOODS"
          :key="m.value"
          type="button"
          role="radio"
          class="wave__chip"
          :aria-checked="mood === m.value"
          @click="choose('mood', m.value)"
        >
          {{ m.label }}
        </button>
      </div>
      <div class="wave__group" role="radiogroup" aria-label="Характер">
        <button
          v-for="d in DIVERSITY"
          :key="d.value"
          type="button"
          role="radio"
          class="wave__chip"
          :aria-checked="diversity === d.value"
          @click="choose('diversity', d.value)"
        >
          {{ d.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.wave {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-5);
  min-height: 176px;
  padding: var(--space-5);
  overflow: hidden;
  border-radius: var(--radius-xl);
  background:
    radial-gradient(120% 120% at 0% 0%, color-mix(in srgb, var(--c-accent) 75%, transparent), transparent 60%),
    radial-gradient(90% 90% at 100% 100%, color-mix(in oklab, var(--c-accent) 45%, #ff8fb3), transparent 70%),
    color-mix(in oklab, var(--c-accent) 40%, #1a1630);
  color: #fff;
  box-shadow: var(--shadow-lg);

  &.is-disabled {
    filter: grayscale(0.6);
    opacity: 0.75;
  }

  &__rings {
    position: absolute;
    top: 50%;
    left: 52px;
    pointer-events: none;

    i {
      position: absolute;
      width: 140px;
      height: 140px;
      margin: -70px 0 0 -70px;
      border: 2px solid rgb(255 255 255 / 0.3);
      border-radius: 50%;
      opacity: 0;
      animation: ring 4.5s ease-out infinite;

      &:nth-child(2) {
        animation-delay: -1.5s;
      }

      &:nth-child(3) {
        animation-delay: -3s;
      }
    }
  }

  &.is-playing &__rings i {
    animation-duration: 2.2s;
  }

  @include down(lg) {
    grid-template-columns: 1fr;
  }

  &__top {
    position: relative;
    display: flex;
    flex-direction: row-reverse;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-4);

    @include down(md) {
      flex-direction: row;
      justify-content: space-between;
    }
  }

  &__title {
    font-size: clamp(2rem, 3.4vw, 2.75rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1;
  }

  &__sub {
    margin-top: var(--space-2);
    color: rgb(255 255 255 / 0.85);
    font-size: var(--fs-sm);
  }

  &__btn {
    @include reset-button;
    @include focus-ring;

    display: grid;
    place-items: center;
    flex: none;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #fff;
    color: #17161d;
    font-size: 22px;
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.25);
    transition: transform var(--dur) var(--ease);

    @include hover {
      transform: scale(1.06);
    }

    &:disabled {
      cursor: not-allowed;
    }

    svg {
      width: 24px;
      height: 24px;
      margin-left: 2px;
    }
  }

  &__settings {
    position: relative;
    display: grid;
    justify-items: end;
    gap: var(--space-2);

    @include down(lg) {
      justify-items: start;
    }
  }

  &__group {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;

    @include down(lg) {
      justify-content: flex-start;
    }
  }

  &__chip {
    @include reset-button;
    @include focus-ring;

    height: 30px;
    padding: 0 12px;
    border-radius: var(--radius-full);
    background: rgb(255 255 255 / 0.14);
    font-size: var(--fs-sm);
    font-weight: 500;
    backdrop-filter: blur(8px);
    transition: background-color var(--dur-fast) var(--ease), color var(--dur-fast);

    @include hover {
      background: rgb(255 255 255 / 0.24);
    }

    &[aria-checked='true'] {
      background: #fff;
      color: #17161d;
    }
  }
}

@keyframes ring {
  0% {
    opacity: 0.8;
    transform: scale(0.4);
  }

  100% {
    opacity: 0;
    transform: scale(2.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .wave__rings i {
    animation: none;
  }
}
</style>
