<script setup lang="ts">
import { Maximize2 } from 'lucide-vue-next'
import { DevicePicker } from '@/features/device-picker'
import { LikeButton } from '@/features/like-track'
import { PlayerControls, PlayerProgress, VolumeControl } from '@/features/player-controls'
import { useNowPlayingView, usePlayer } from '@/entities/player'
import { ArtistLinks, TrackTitleLink } from '@/entities/track'
import { UiCover, UiIconButton } from '@/shared/ui'

const p = usePlayer()
const view = useNowPlayingView()

// Свайп по мини-плееру (телефон): влево — следующий трек, вправо — предыдущий.
// Трек «едет» за пальцем; короткое движение возвращается на место. Вызов next/previous — в touchend,
// это жест пользователя: iOS разрешит звук.
const SWIPE_PX = 64
const dragX = ref(0)
const settling = ref(false)
let start: { x: number, y: number } | null = null
let horizontal: boolean | null = null
let swiped = false

function onTouchStart(e: TouchEvent) {
  const t = e.touches[0]!
  start = { x: t.clientX, y: t.clientY }
  horizontal = null
  settling.value = false
}
function onTouchMove(e: TouchEvent) {
  if (!start) return
  const t = e.touches[0]!
  const dx = t.clientX - start.x
  const dy = t.clientY - start.y
  // Направление решаем по первым пикселям: вертикальное движение — это прокрутка страницы
  if (horizontal === null && Math.hypot(dx, dy) > 8) horizontal = Math.abs(dx) > Math.abs(dy)
  if (horizontal) dragX.value = dx
}
function onTouchEnd() {
  if (!start) return
  const dx = dragX.value
  start = null
  settling.value = true
  if (horizontal && Math.abs(dx) >= SWIPE_PX) {
    swiped = true
    if (dx < 0) p.next()
    else p.previous()
  }
  else if (horizontal) {
    swiped = true // короткий горизонтальный сдвиг — не «тап», карточку не открываем
  }
  dragX.value = 0
}

// На телефоне мини-плеер целиком открывает карточку (ссылки там мелкие и мешали бы).
function onTrackAreaClick(e: MouseEvent) {
  if (swiped) {
    swiped = false
    e.preventDefault()
    return
  }
  if (window.matchMedia('(max-width: 767.98px)').matches) {
    e.preventDefault()
    view.show()
  }
}

const progress = computed(() => (p.duration.value ? (p.position.value / p.duration.value) * 100 : 0))
const engineLabel = computed(() => {
  const t = p.current.value
  if (!t || !p.engine.value) return ''
  if (t.source === 'spotify' && p.engine.value === 'yandex') return 'Spotify · через Яндекс'
  return p.engine.value === 'spotify' ? 'Spotify' : 'Яндекс Музыка'
})
</script>

<template>
  <div v-if="p.current.value" class="player" :class="{ 'is-remote': p.controlling.value }" role="region" aria-label="Плеер">
    <div v-if="p.controlling.value" class="player__remote">
      Играет на «{{ p.remoteDevice.value?.name }}»
    </div>
    <div class="player__mobile-progress" :style="{ width: `${progress}%` }" />

    <!-- Обложка открывает карточку песни; на телефоне — вся левая часть. Название и исполнители — ссылки (на компьютере). -->
    <div
      class="player__track"
      :class="{ 'is-settling': settling }"
      :style="dragX ? { transform: `translateX(${dragX}px)`, opacity: String(1 - Math.min(Math.abs(dragX) / 240, 0.5)) } : undefined"
      @click="onTrackAreaClick"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    >
      <button type="button" class="player__cover-btn" aria-label="Открыть «Сейчас играет»" @click.stop="view.show()">
        <UiCover :src="p.current.value.coverUrl" :size="48" class="player__cover" />
      </button>
      <span class="player__meta">
        <TrackTitleLink :track="p.current.value" class="player__title" />
        <ArtistLinks :track="p.current.value" class="player__artists" />
        <span v-if="p.error.value" class="player__error" role="alert">{{ p.error.value }}</span>
      </span>
    </div>

    <LikeButton :track="p.current.value" class="player__like" />

    <div class="player__center">
      <PlayerControls class="player__controls" />
      <PlayerProgress class="player__progress" />
    </div>

    <div class="player__mobile-controls">
      <DevicePicker v-if="p.devices.value.length > 1" />
      <LikeButton :track="p.current.value" />
      <PlayerControls compact />
    </div>

    <div class="player__side">
      <span class="player__engine">{{ engineLabel }}</span>
      <VolumeControl />
      <DevicePicker />
      <UiIconButton label="Развернуть" size="sm" @click="view.show()">
        <Maximize2 />
      </UiIconButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.player {
  @include glass(true);

  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(320px, 1.6fr) minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
  height: var(--player-height);
  padding: 0 var(--space-3);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;

  @include down(md) {
    grid-template-columns: minmax(0, 1fr) auto;
    height: var(--mini-player-height);
    padding: 0 var(--space-2);
    border-radius: var(--radius-md);
  }

  // Управляем другим устройством — акцентная полоска сверху, как в Spotify.
  &.is-remote {
    padding-top: 18px;

    @include down(md) {
      padding-top: 14px;
    }
  }

  &__remote {
    @include truncate;

    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    height: 18px;
    padding: 0 var(--space-4);
    background: var(--c-accent);
    color: var(--c-on-accent);
    font-size: 11px;
    font-weight: 700;
    line-height: 18px;
    text-align: right;

    @include down(md) {
      height: 14px;
      font-size: 10px;
      line-height: 14px;
      text-align: left;
    }
  }

  &__mobile-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    background: var(--c-accent);
    transition: width 0.5s linear;

    @include up(md) {
      display: none;
    }
  }

  &__track {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;

    &.is-settling {
      transition: transform 0.25s var(--ease), opacity 0.25s var(--ease);
    }

    @include down(md) {
      cursor: pointer;
      touch-action: pan-y; // горизонтальный жест — наш (свайп треков), вертикальный — прокрутка

      // На телефоне ссылки не перехватывают нажатие — открывается карточка.
      :deep(a) {
        pointer-events: none;
      }
    }
  }

  &__cover-btn {
    @include reset-button;
    @include focus-ring;

    flex: none;
    border-radius: var(--radius-sm);
  }

  &__cover {
    transition: transform var(--dur) var(--ease);

    @include down(md) {
      width: 44px !important;
      height: 44px !important;
    }
  }

  &__cover-btn:hover &__cover {
    transform: scale(1.04);
  }

  &__meta {
    display: grid;
    min-width: 0;
  }

  &__title {
    @include truncate;

    font-weight: 600;
  }

  &__artists {
    @include truncate;

    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__error {
    @include truncate;

    color: var(--c-danger);
    font-size: var(--fs-xs);

    // В мини-плеере не место для ошибок — их видно в карточке «Сейчас играет».
    @include down(md) {
      display: none;
    }
  }

  &__center {
    display: grid;
    justify-items: center;
    gap: 2px;
  }

  &__progress {
    max-width: 560px;
  }

  &__mobile-controls {
    display: flex;
    align-items: center;

    @include up(md) {
      display: none;
    }
  }

  &__side {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
    min-width: 0;
  }

  &__engine {
    @include truncate;

    color: var(--c-text-subtle);
    font-size: var(--fs-xs);

    @include down(xl) {
      display: none;
    }
  }

  // Мобильный мини-плеер: только обложка, название, лайк, пауза и «следующий».
  // Правила стоят В КОНЦЕ: иначе display из блоков выше перебьёт скрытие.
  @include down(md) {
    &__like,
    &__center,
    &__side {
      display: none;
    }

    &__title {
      font-size: var(--fs-md);
    }

    &__mobile-controls {
      gap: 2px;
      margin-right: -4px;
    }
  }
}
</style>
