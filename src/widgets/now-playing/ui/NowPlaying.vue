<script setup lang="ts">
import { ChevronDown, Disc3, ListMusic, ListPlus, MicVocal } from 'lucide-vue-next'
import { AddToPlaylistDialog } from '@/features/add-to-playlist'
import { DevicePicker } from '@/features/device-picker'
import { LikeButton } from '@/features/like-track'
import { SleepTimerButton } from '@/features/sleep-timer'
import { PlayerControls, PlayerProgress, VolumeControl } from '@/features/player-controls'
import { useNowPlayingView, usePlayer } from '@/entities/player'
import { ArtistLinks, TrackTitleLink } from '@/entities/track'
import { useTilt } from '@/shared/lib'
import { UiCover, UiIconButton } from '@/shared/ui'
import LyricsPanel from './LyricsPanel.vue'

/**
 * Полноэкранная карточка песни: обложка со свечением её цветов, крупное название,
 * управление, действия и сворачиваемая очередь.
 */
const p = usePlayer()
const view = useNowPlayingView()
const route = useRoute()

/** Что показывать под управлением: очередь, текст песни или ничего */
const panel = ref<'queue' | 'lyrics' | null>('queue')
const togglePanel = (v: 'queue' | 'lyrics') => (panel.value = panel.value === v ? null : v)
// 3D-наклон обложки за курсором
const art = ref<HTMLElement | null>(null)
useTilt(art, { max: 14 })
const addOpen = ref(false)

const upNext = computed(() =>
  p.queue.value.map((t, i) => ({ t, i })).slice(p.index.value + 1, p.index.value + 40),
)
const queueLeft = computed(() => Math.max(0, p.queue.value.length - p.index.value - 1))

const sourceLabel = computed(() => {
  const t = p.current.value
  if (!t) return ''
  const radio = p.radioSource.value
  const from = radio?.station === 'wave'
    ? 'Моя волна'
    : radio?.station === 'artist'
      ? `Радио: ${radio.name}`
      : radio?.station === 'id'
        ? `Станция${radio.name ? `: ${radio.name}` : ''}`
        : ''
  const via = t.source === 'spotify' && p.engine.value === 'yandex'
    ? 'Spotify через Яндекс'
    : t.source === 'spotify' ? 'Spotify' : 'Яндекс Музыка'
  return [from, via].filter(Boolean).join(' · ')
})

function goToAlbum() {
  const t = p.current.value
  if (!t?.albumId) return
  view.hide()
  navigateTo(`/album/${t.source}:${t.albumId}`)
}

// Свайп вниз (на телефоне) сворачивает карточку — тянем за шапку или обложку.
const sheet = ref<HTMLElement | null>(null)
const dragY = ref(0)
let startY: number | null = null
function onTouchStart(e: TouchEvent) {
  // Только когда карточка прокручена в самый верх — иначе это обычная прокрутка.
  if ((sheet.value?.scrollTop ?? 0) > 0) return
  startY = e.touches[0]!.clientY
}
function onTouchMove(e: TouchEvent) {
  if (startY === null) return
  dragY.value = Math.max(0, e.touches[0]!.clientY - startY)
}
function onTouchEnd() {
  if (startY === null) return
  if (dragY.value > 110) view.hide()
  dragY.value = 0
  startY = null
}

// Закрываем при навигации и по Esc; блокируем прокрутку страницы под карточкой.
watch(() => route.fullPath, () => view.hide())
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && !addOpen.value) view.hide()
}
watch(view.open, (o) => {
  if (import.meta.server) return
  document.documentElement.style.overflow = o ? 'hidden' : ''
  if (o) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="view.open.value && p.current.value"
        ref="sheet"
        class="np"
        :class="{ 'is-dragging': dragY > 0 }"
        :style="dragY ? { transform: `translateY(${dragY}px)`, opacity: String(1 - Math.min(dragY / 600, 0.4)) } : undefined"
        role="dialog"
        aria-modal="true"
        aria-label="Сейчас играет"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend="onTouchEnd"
        @touchcancel="onTouchEnd"
      >
        <!-- Фон: размытая обложка -->
        <div class="np__bg" aria-hidden="true">
          <Transition name="fade">
            <img v-if="p.current.value.coverUrl" :key="p.current.value.coverUrl" :src="p.current.value.coverUrl" alt="">
          </Transition>
        </div>

        <span class="np__grabber" aria-hidden="true" />
        <header class="np__bar">
          <UiIconButton label="Свернуть" variant="filled" @click="view.hide()">
            <ChevronDown />
          </UiIconButton>
          <span class="np__context">{{ sourceLabel }}</span>
        </header>

        <div class="np__body">
          <!-- Обложка со свечением собственных цветов -->
          <div ref="art" class="np__art">
            <div class="np__tilt">
              <Transition name="cover" mode="out-in">
                <div :key="p.current.value.uid" class="np__art-inner" :class="{ 'is-paused': !p.isPlaying.value }">
                  <img v-if="p.current.value.coverUrl" :src="p.current.value.coverUrl" class="np__glow" alt="" aria-hidden="true">
                  <UiCover :src="p.current.value.coverUrl" :size="560" rounded="md" class="np__cover" />
                  <span class="np__glare" aria-hidden="true" />
                </div>
              </Transition>
            </div>
          </div>

          <section class="np__side">
            <div class="np__meta">
              <h2 class="np__title">
                <TrackTitleLink :track="p.current.value" />
              </h2>
              <p class="np__artists">
                <ArtistLinks :track="p.current.value" />
              </p>
              <button v-if="p.current.value.albumId" type="button" class="np__album" @click="goToAlbum">
                <Disc3 /> {{ p.current.value.album || 'Альбом' }}
              </button>
            </div>

            <PlayerProgress stacked class="np__progress" />
            <PlayerControls size="lg" class="np__controls" />

            <div class="np__actions">
              <LikeButton :track="p.current.value" size="md" />
              <UiIconButton label="Добавить в плейлист" @click="addOpen = true">
                <ListPlus />
              </UiIconButton>
              <UiIconButton label="Текст песни" :active="panel === 'lyrics'" @click="togglePanel('lyrics')">
                <MicVocal />
              </UiIconButton>
              <UiIconButton label="Очередь" :active="panel === 'queue'" @click="togglePanel('queue')">
                <ListMusic />
              </UiIconButton>
              <SleepTimerButton />
              <DevicePicker size="md" />
              <VolumeControl class="np__volume" />
            </div>

            <p v-if="p.error.value" class="np__error" role="alert">
              {{ p.error.value }}
            </p>

            <Transition name="queue" mode="out-in">
              <LyricsPanel v-if="panel === 'lyrics'" key="lyrics" />
              <div v-else-if="panel === 'queue' && upNext.length" key="queue" class="np__queue">
                <div class="np__queue-head">
                  <span>Далее</span>
                  <span class="np__queue-count">{{ queueLeft }}</span>
                </div>
                <ol class="np__queue-list">
                  <li v-for="{ t, i } in upNext" :key="`${t.uid}-${i}`">
                    <button type="button" class="q-item" @click="p.playAt(i)">
                      <UiCover :src="t.coverUrl" :size="40" />
                      <span class="q-item__text">
                        <span class="q-item__title">{{ t.title }}</span>
                        <span class="q-item__artists">{{ t.artists.join(', ') }}</span>
                      </span>
                    </button>
                  </li>
                </ol>
              </div>
            </Transition>
          </section>
        </div>

        <AddToPlaylistDialog v-model:open="addOpen" :track="p.current.value" />
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.np {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  grid-template-rows: auto 1fr;
  padding: var(--space-4) var(--space-6) var(--space-5);
  padding-top: calc(var(--space-4) + env(safe-area-inset-top));
  padding-bottom: calc(var(--space-5) + env(safe-area-inset-bottom));
  overflow-y: auto;
  background: var(--c-bg);

  @include down(md) {
    padding-inline: var(--space-4);
  }

  &__bg {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;

    img {
      position: absolute;
      inset: -25%;
      width: 150%;
      height: 150%;
      object-fit: cover;
      opacity: calc(var(--ambient-opacity) + 0.2);
      filter: blur(120px) saturate(1.8);
    }

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(80% 60% at 30% 40%, transparent, color-mix(in srgb, var(--c-bg) 55%, transparent)),
        linear-gradient(to bottom, color-mix(in srgb, var(--c-bg) 20%, transparent), color-mix(in srgb, var(--c-bg) 70%, transparent));
    }
  }

  &__bar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }

  &__context {
    @include truncate;

    color: var(--c-text-muted);
    font-size: var(--fs-sm);
    font-weight: 600;
  }

  // Две колонки: обложка | информация. На узком экране — друг под другом.
  &__body {
    display: grid;
    grid-template-columns: minmax(0, min(46vh, 560px)) minmax(320px, 520px);
    justify-content: center;
    align-items: center;
    gap: clamp(var(--space-6), 6vw, 96px);
    padding: var(--space-5) 0;

    @include down(lg) {
      grid-template-columns: minmax(0, 520px);
      align-items: start;
      gap: var(--space-5);
    }
  }

  // Перспектива для 3D-наклона (переменные --tilt-* пишет useTilt).
  &__art {
    perspective: 1100px;

    @include down(lg) {
      justify-self: center;
      width: min(100%, 46dvh);
    }
  }

  &__tilt {
    transform: rotateX(var(--tilt-rx, 0deg)) rotateY(var(--tilt-ry, 0deg));
    transform-style: preserve-3d;
    transition: transform 0.6s var(--ease);
    will-change: transform;
  }

  // Пока курсор двигается — следуем быстро, после ухода — плавно возвращаемся.
  &__art:hover &__tilt {
    transition-duration: 0.12s;
  }

  // Блик: светлое пятно под курсором поверх обложки.
  &__glare {
    position: absolute;
    inset: 0;
    border-radius: var(--radius-lg);
    background: radial-gradient(
      circle at var(--tilt-gx, 50%) var(--tilt-gy, 50%),
      rgb(255 255 255 / 0.35),
      rgb(255 255 255 / 0.08) 35%,
      transparent 65%
    );
    mix-blend-mode: soft-light;
    opacity: var(--tilt-active, 0);
    transition: opacity 0.4s var(--ease);
    pointer-events: none;
  }

  &__art-inner {
    position: relative;
    transition: transform 0.5s var(--ease);

    // На паузе обложка чуть «отъезжает», как в привычных плеерах.
    &.is-paused {
      transform: scale(0.94);
    }
  }

  // Свечение: та же обложка, сильно размытая под оригиналом.
  &__glow {
    position: absolute;
    inset: 8% 6% -6%;
    width: 88%;
    height: 98%;
    object-fit: cover;
    border-radius: var(--radius-lg);
    filter: blur(40px) saturate(1.6);
    opacity: 0.75;
    transform: translate3d(calc(var(--tilt-x, 0) * -18px), calc(var(--tilt-y, 0) * -18px), -40px);
    transition: transform 0.6s var(--ease);
  }

  &__cover {
    position: relative;
    transform: translateZ(20px);
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 1;
    border-radius: var(--radius-lg) !important;
    box-shadow: 0 30px 60px rgb(0 0 0 / 0.35);
  }

  &__side {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
  }

  &__meta {
    display: grid;
    justify-items: start;
    gap: var(--space-1);
    min-width: 0;
  }

  &__title {
    display: -webkit-box;
    overflow: hidden;
    font-size: clamp(1.75rem, 3.2vw, 2.75rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.05;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  &__artists {
    @include truncate;

    max-width: 100%;
    color: var(--c-text-muted);
    font-size: var(--fs-lg);
    font-weight: 500;
  }

  &__album {
    @include reset-button;
    @include truncate;

    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    margin-top: var(--space-1);
    padding: 4px 10px;
    border-radius: var(--radius-full);
    background: var(--c-surface);
    color: var(--c-text-muted);
    font-size: var(--fs-xs);
    font-weight: 600;

    svg {
      width: 14px;
      height: 14px;
      flex: none;
    }

    @include hover {
      background: var(--c-surface-hover);
      color: var(--c-text);
    }
  }

  &__controls {
    justify-content: space-between;
    padding: 0 var(--space-2);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding-top: var(--space-1);
    border-top: 1px solid var(--c-border);
  }

  &__volume {
    margin-left: auto;

    @include down(md) {
      display: none;
    }
  }

  &__error {
    color: var(--c-danger);
    font-size: var(--fs-sm);
  }

  &__queue {
    @include glass;

    display: grid;
    gap: var(--space-1);
    padding: var(--space-3) var(--space-2) var(--space-2);
    border-radius: var(--radius-lg);
  }

  &__queue-head {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0 var(--space-2);
    font-size: var(--fs-sm);
    font-weight: 700;
  }

  &__queue-count {
    padding: 0 7px;
    border-radius: var(--radius-full);
    background: var(--c-surface);
    color: var(--c-text-muted);
    font-size: var(--fs-xs);
    line-height: 18px;
  }

  &__grabber {
    display: none;
  }

  // Телефон: всё главное помещается на экран — обложка меньше, отступы плотнее,
  // кнопки действий разнесены по ширине. Правила внизу — чтобы перекрыть общие.
  @include down(md) {
    grid-template-rows: auto auto 1fr;
    padding-top: calc(var(--space-2) + env(safe-area-inset-top));

    &.is-dragging {
      transition: none;
    }

    &__grabber {
      display: block;
      justify-self: center;
      width: 40px;
      height: 5px;
      margin-bottom: var(--space-2);
      border-radius: var(--radius-full);
      background: var(--c-surface-active);
    }

    &__bar {
      min-height: 40px;
    }

    &__body {
      gap: var(--space-4);
      padding: var(--space-3) 0 0;
    }

    &__art {
      width: min(100%, 40dvh);
    }

    &__side {
      gap: var(--space-3);
    }

    &__title {
      font-size: 1.6rem;
      -webkit-line-clamp: 1;
    }

    &__artists {
      font-size: var(--fs-md);
    }

    &__controls {
      padding: 0;
    }

    &__actions {
      justify-content: space-between;
      padding-top: var(--space-2);
    }
  }

  &__queue-list {
    max-height: min(240px, 28dvh);
    overflow-y: auto;
    scrollbar-width: thin;
  }
}

.q-item {
  @include reset-button;

  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: 6px var(--space-2);
  border-radius: var(--radius-md);
  text-align: left;

  @include hover {
    background: var(--c-surface);
  }

  &__text {
    display: grid;
    min-width: 0;
  }

  &__title {
    @include truncate;

    font-size: var(--fs-sm);
    font-weight: 500;
  }

  &__artists {
    @include truncate;

    color: var(--c-text-muted);
    font-size: var(--fs-xs);
  }
}

.sheet-enter-active,
.sheet-leave-active {
  transition: transform 0.4s var(--ease), opacity 0.4s var(--ease);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
  transform: translateY(8%);
}

.cover-enter-active,
.cover-leave-active {
  transition: opacity 0.3s var(--ease), transform 0.3s var(--ease);
}

.cover-enter-from {
  opacity: 0;
  transform: translateX(24px) scale(0.96);
}

.cover-leave-to {
  opacity: 0;
  transform: translateX(-24px) scale(0.96);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s var(--ease);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.queue-enter-active,
.queue-leave-active {
  transition: opacity var(--dur) var(--ease), transform var(--dur) var(--ease);
}

.queue-enter-from,
.queue-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .np__art-inner {
    transition: none;
  }
}
</style>
