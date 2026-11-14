<script setup lang="ts">
import { Ban, ChevronDown, Disc3, Heart, Info, ListPlus, Maximize2, Send } from 'lucide-vue-next'
import { AddToPlaylistDialog } from '@/features/add-to-playlist'
import { ShareWithFriendDialog } from '@/features/share-with-friend'
import { useMusicServices } from '@/entities/preferences'
import { DevicePicker } from '@/features/device-picker'
import { LikeButton } from '@/features/like-track'
import { useDislike } from '@/features/track-actions'
import { TrackInfoDialog } from '@/features/track-info'
import { useLikes } from '@/entities/library'
import { SleepTimerButton } from '@/features/sleep-timer'
import { PlayerControls, PlayerProgress, VolumeControl } from '@/features/player-controls'
import { AudioVisualizer, useNowPlayingView, usePlayer } from '@/entities/player'
import { ArtistLinks, TrackTitleLink, TrackVideo } from '@/entities/track'
import { coverOfSize, useLoadedSrc, useTilt } from '@/shared/lib'
import { UiCover, UiIconButton, UiSegmented } from '@/shared/ui'
import ImmersiveView from './ImmersiveView.vue'
import LyricsPanel from './LyricsPanel.vue'

/**
 * Полноэкранная карточка песни: обложка со свечением её цветов, крупное название,
 * управление, действия и сворачиваемая очередь.
 */
const p = usePlayer()
// Фон меняется, только когда новая обложка загрузилась — без «пустоты» при быстрой смене треков
const bgSrc = useLoadedSrc(() => coverOfSize(p.current.value?.coverUrl, 100))
const view = useNowPlayingView()
const route = useRoute()

/** Что показывать под управлением: очередь, текст песни или ничего */
// Вкладки под управлением: подписанные, а не иконки, которые приходится угадывать
type Panel = 'queue' | 'lyrics' | 'similar'
const panel = ref<Panel>('queue')
const music = useMusicServices()
const TABS = computed(() => [
  { value: 'queue' as Panel, label: 'Далее' },
  { value: 'lyrics' as Panel, label: 'Текст' },
  // «Похожие» подбирает радио Яндекса
  ...(music.hasYandex.value ? [{ value: 'similar' as Panel, label: 'Похожие' }] : []),
])

// Похожие на текущий трек — грузятся, только когда открыта вкладка
const { data: similar, status: similarStatus } = useAsyncData(
  'np:similar',
  () => (panel.value === 'similar' && p.current.value
    ? $fetch<Track[]>('/api/radio', { method: 'POST', body: { station: 'similar', seed: p.current.value, exclude: [p.current.value.uid] } })
    : Promise.resolve([] as Track[])),
  { watch: [panel, () => p.current.value?.uid], server: false, default: () => [] as Track[] },
)
/** Включить похожий трек сразу (встаёт следующим и играет) */
function playSimilar(t: Track) {
  p.playNext(t)
  p.next()
}
// 3D-наклон обложки за курсором
const art = ref<HTMLElement | null>(null)
useTilt(art, { max: 14 })
const addOpen = ref(false)
const shareOpen = ref(false)
const infoOpen = ref(false)
const { dislike } = useDislike()
const likes = useLikes()

/**
 * Трек, чья обложка показана. Меняется, когда новая обложка уже загружена (не дольше 1,2 с) —
 * без пустого квадрата при быстром листании. Остальное (название, время) меняется сразу.
 */
const shown = shallowRef<Track | null>(p.current.value)
let coverSeq = 0
watch(() => p.current.value, (t) => {
  const id = ++coverSeq
  const url = coverOfSize(t?.coverUrl, 560)
  if (!t || !url || import.meta.server) {
    shown.value = t
    return
  }
  const done = () => {
    if (id === coverSeq) shown.value = t
  }
  const img = new Image()
  img.src = url
  img.decode().then(done, done)
  setTimeout(done, 1200)
})
/** Куда уезжает обложка: вперёд по очереди — влево, назад — вправо */
const slideDir = ref<'next' | 'prev'>('next')
watch(() => p.index.value, (i, old) => {
  if (old >= 0 && i >= 0 && i !== old) slideDir.value = i > old ? 'next' : 'prev'
})

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
  view.hide(false)
  navigateTo(`/album/${t.source}:${t.albumId}`)
}

/**
 * Жесты на телефоне:
 *  - вниз (карточка прокручена в самый верх) — свернуть;
 *  - обложку влево/вправо — следующий/предыдущий трек;
 *  - двойное касание обложки — в любимые (с сердечком).
 * Направление определяется по первым 10 px движения и дальше не меняется.
 */
const sheet = ref<HTMLElement | null>(null)
const dragY = ref(0)
const dragX = ref(0)
let touch: { x: number, y: number, onArt: boolean, atTop: boolean, axis: 'x' | 'y' | null } | null = null
let lastTap = 0
function onTouchStart(e: TouchEvent) {
  const t = e.touches[0]!
  touch = {
    x: t.clientX,
    y: t.clientY,
    onArt: !!art.value?.contains(e.target as Node),
    atTop: (sheet.value?.scrollTop ?? 0) <= 0,
    axis: null,
  }
}
function onTouchMove(e: TouchEvent) {
  if (!touch) return
  const t = e.touches[0]!
  const dx = t.clientX - touch.x
  const dy = t.clientY - touch.y
  if (!touch.axis) {
    if (Math.hypot(dx, dy) < 10) return
    touch.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
  }
  if (touch.axis === 'x' && touch.onArt) dragX.value = dx
  else if (touch.axis === 'y' && touch.atTop) dragY.value = Math.max(0, dy)
}
function onTouchEnd() {
  if (!touch) return
  const { axis, onArt } = touch
  touch = null
  if (axis === 'x' && onArt) {
    const dx = dragX.value
    dragX.value = 0
    // touchend — это жест: iOS разрешит звук следующего трека
    if (dx < -70) {
      slideDir.value = 'next'
      p.next()
    }
    else if (dx > 70) {
      slideDir.value = 'prev'
      p.previous()
    }
    return
  }
  // Шторку уже тянут вниз пальцем — закрываем её обычной анимацией, без «перелёта»
  if (dragY.value > 110) view.hide(false)
  dragY.value = 0
  if (axis === null && onArt) {
    const now = Date.now()
    if (now - lastTap < 320) {
      lastTap = 0
      likeWithBurst()
    }
    else lastTap = now
  }
}

// Мышь: двойной клик. На тач-экранах — своё распознавание в touchend (dblclick там ненадёжен)
function onDblClick() {
  if (matchMedia('(pointer: fine)').matches) likeWithBurst()
}
/** Двойное касание / двойной клик по обложке: в любимые (снять лайк так нельзя — только кнопкой) */
const burst = ref(0)
function likeWithBurst() {
  const t = p.current.value
  if (!t) return
  burst.value++
  navigator.vibrate?.(10)
  if (!likes.isLiked(t.uid)) likes.toggle(t)
}

// Полноэкранный режим: караоке + визуализатор. На компьютере ещё и браузер разворачивается на весь экран.
const immersive = ref(false)
let ownFullscreen = false
function enterImmersive() {
  immersive.value = true
  const el = sheet.value
  if (el && document.fullscreenEnabled && !document.fullscreenElement && window.matchMedia('(pointer: fine)').matches) {
    ownFullscreen = true
    el.requestFullscreen().catch(() => (ownFullscreen = false))
  }
}
function exitImmersive() {
  immersive.value = false
  if (ownFullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => {})
  ownFullscreen = false
}
// Esc в полноэкранном режиме браузер забирает себе — выходим из режима вместе с ним
function onFullscreenChange() {
  if (!document.fullscreenElement && ownFullscreen) {
    ownFullscreen = false
    immersive.value = false
  }
}

// Закрываем при навигации и по Esc; блокируем прокрутку страницы под карточкой.
watch(() => route.fullPath, () => {
  exitImmersive()
  view.hide(false)
})
function onKey(e: KeyboardEvent) {
  if (addOpen.value || shareOpen.value || infoOpen.value) return
  const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName))
  if (e.key === 'Escape') {
    if (immersive.value) exitImmersive()
    else view.hide()
  }
  // F (или А в русской раскладке) — полноэкранный режим
  else if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && (e.code === 'KeyF')) {
    e.preventDefault()
    if (immersive.value) exitImmersive()
    else enterImmersive()
  }
}
watch(view.open, (o) => {
  if (import.meta.server) return
  document.documentElement.style.overflow = o ? 'hidden' : ''
  if (o) {
    window.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFullscreenChange)
  }
  else {
    window.removeEventListener('keydown', onKey)
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    exitImmersive()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet" :css="!view.morphing.value">
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
            <img v-if="bgSrc" :key="bgSrc" :src="bgSrc" alt="">
          </Transition>
        </div>

        <span class="np__grabber" aria-hidden="true" />
        <header class="np__bar">
          <UiIconButton label="Свернуть" variant="filled" @click="view.hide()">
            <ChevronDown />
          </UiIconButton>
          <span class="np__context">{{ sourceLabel }}</span>
          <UiIconButton label="Полноэкранный режим (F)" variant="filled" class="np__immersive" @click="enterImmersive">
            <Maximize2 />
          </UiIconButton>
        </header>

        <ImmersiveView v-if="immersive" @exit="exitImmersive" />

        <div class="np__body">
          <!-- Обложка со свечением собственных цветов -->
          <div ref="art" class="np__art" @dblclick="onDblClick">
            <div
              class="np__swipe"
              :class="{ 'is-dragging': dragX !== 0 }"
              :style="dragX ? { transform: `translateX(${dragX}px) rotate(${dragX / 40}deg)` } : undefined"
            >
              <div class="np__tilt">
                <!-- Старая обложка уезжает, новая въезжает одновременно (без пустого промежутка) -->
                <Transition :name="`cover-${slideDir}`">
                  <div v-if="shown" :key="shown.uid" class="np__art-inner" :class="{ 'is-paused': !p.isPlaying.value }">
                    <img v-if="shown.coverUrl" :src="coverOfSize(shown.coverUrl, 100)" class="np__glow" alt="" aria-hidden="true">
                    <UiCover :src="shown.coverUrl" :size="560" rounded="md" class="np__cover" />
                    <TrackVideo :track="shown" :playing="p.isPlaying.value" class="np__video" />
                    <span class="np__glare" aria-hidden="true" />
                  </div>
                </Transition>
              </div>
              <span v-if="burst" :key="burst" class="np__burst" aria-hidden="true"><Heart fill="currentColor" /></span>
            </div>
            <!-- Спектр звука: только компьютер и треки Яндекса (у Spotify звук под DRM) -->
            <AudioVisualizer v-if="p.visualizer.value" class="np__viz" />
          </div>

          <section class="np__side">
            <div class="np__meta">
              <div class="np__heading">
                <div class="np__titles">
                  <h2 class="np__title">
                    <TrackTitleLink :track="p.current.value" />
                  </h2>
                  <p class="np__artists">
                    <ArtistLinks :track="p.current.value" />
                  </p>
                </div>
                <LikeButton :track="p.current.value" size="lg" class="np__like" />
              </div>
              <button v-if="p.current.value.albumId" type="button" class="np__album" @click="goToAlbum">
                <Disc3 /> {{ p.current.value.album || 'Альбом' }}
              </button>
            </div>

            <PlayerProgress stacked class="np__progress" />
            <PlayerControls size="lg" class="np__controls" />

            <div class="np__actions">
              <UiIconButton label="Добавить в плейлист" @click="addOpen = true">
                <ListPlus />
              </UiIconButton>
              <UiIconButton label="Отправить другу" @click="shareOpen = true">
                <Send />
              </UiIconButton>
              <UiIconButton label="Сведения о треке" @click="infoOpen = true">
                <Info />
              </UiIconButton>
              <UiIconButton v-if="music.hasYandex.value" label="Больше не предлагать" @click="dislike(p.current.value)">
                <Ban />
              </UiIconButton>
              <SleepTimerButton />
              <DevicePicker size="md" />
              <VolumeControl class="np__volume" />
            </div>

            <p v-if="p.error.value" class="np__error" role="alert">
              {{ p.error.value }}
            </p>

            <UiSegmented v-model="panel" :options="TABS" label="Что показать" class="np__tabs" />

            <Transition name="queue" mode="out-in">
              <LyricsPanel v-if="panel === 'lyrics'" key="lyrics" />
              <div v-else-if="panel === 'similar'" key="similar" class="np__queue">
                <p v-if="similarStatus === 'pending'" class="np__panel-state">
                  Подбираем…
                </p>
                <p v-else-if="!similar.length" class="np__panel-state">
                  Не удалось подобрать похожие треки
                </p>
                <ol v-else class="np__queue-list">
                  <li v-for="t in similar" :key="t.uid">
                    <button type="button" class="q-item" @click="playSimilar(t)">
                      <UiCover :src="t.coverUrl" :size="40" />
                      <span class="q-item__text">
                        <span class="q-item__title">{{ t.title }}</span>
                        <span class="q-item__artists">{{ t.artists.join(', ') }}</span>
                      </span>
                    </button>
                  </li>
                </ol>
              </div>
              <p v-else-if="panel === 'queue' && !upNext.length" key="queue-empty" class="np__queue np__panel-state">
                {{ p.autoplay.value && music.hasYandex.value ? 'Очередь пуста — дальше включится похожая музыка' : 'Очередь пуста' }}
              </p>
              <div v-else-if="panel === 'queue'" key="queue" class="np__queue">
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
        <ShareWithFriendDialog v-model:open="shareOpen" :track="p.current.value" />
        <TrackInfoDialog v-model:open="infoOpen" :track="p.current.value" />
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
  overflow-x: hidden;
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

  &__immersive {
    margin-left: auto;
    flex: none;
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

  &__viz {
    margin-top: var(--space-4);
  }

  // Свайп обложки пальцем: едет за пальцем, отпустили — плавно возвращается
  &__swipe {
    position: relative;
    perspective: 1100px;
    touch-action: pan-y;
    transition: transform 0.35s var(--ease);

    &.is-dragging {
      transition: none;
    }
  }

  // Сердечко при двойном касании
  &__burst {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    place-items: center;
    color: #fff;
    pointer-events: none;
    animation: burst 0.8s var(--ease) forwards;

    svg {
      width: 28%;
      height: 28%;
      filter: drop-shadow(0 8px 24px rgb(0 0 0 / 0.4));
    }
  }

  &__tilt {
    // Старая и новая обложки в одной ячейке — накладываются при смене
    display: grid;

    > * {
      grid-area: 1 / 1;
    }

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
    // «Перелёт» обложки из мини-плеера (см. entities/player/model/now-playing.ts)
    view-transition-name: np-cover;
    transform: translateZ(20px);
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 1;
    border-radius: var(--radius-lg) !important;
    box-shadow: 0 30px 60px rgb(0 0 0 / 0.35);
  }

  // Видеообложка лежит в той же 3D-плоскости, что и обложка (чуть выше)
  & &__video {
    transform: translateZ(21px);
    border-radius: var(--radius-lg);
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

  // Название и исполнители слева, лайк справа — как в привычных плеерах
  &__heading {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    min-width: 0;
  }

  &__titles {
    display: grid;
    flex: 1;
    gap: var(--space-1);
    min-width: 0;
  }

  &__like {
    flex: none;
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

    @media (pointer: coarse) {
      min-height: 32px;
      padding-inline: 12px;
    }

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

  &__tabs {
    justify-self: start;
  }

  &__panel-state {
    padding: var(--space-4);
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
    text-align: center;
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

    // Обложка — сколько остаётся по высоте после названия, управления и действий:
    // всё главное помещается на первый экран, вкладки «Далее / Текст» — ниже
    &__art {
      width: min(100%, max(180px, calc(100dvh - 430px - env(safe-area-inset-top) - env(safe-area-inset-bottom))));
    }

    &__side {
      gap: var(--space-3);
    }

    &__title {
      font-size: 1.5rem;
      -webkit-line-clamp: 1;
    }

    &__album {
      margin-top: 0;
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

.cover-next-enter-active,
.cover-next-leave-active,
.cover-prev-enter-active,
.cover-prev-leave-active {
  transition: opacity 0.35s var(--ease), transform 0.35s var(--ease);
}

.cover-next-enter-from,
.cover-prev-leave-to {
  opacity: 0;
  transform: translateX(40%) scale(0.9);
}

.cover-next-leave-to,
.cover-prev-enter-from {
  opacity: 0;
  transform: translateX(-40%) scale(0.9);
}

@keyframes burst {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }

  25% {
    opacity: 1;
    transform: scale(1.15);
  }

  45% {
    transform: scale(1);
  }

  100% {
    opacity: 0;
    transform: scale(1.05);
  }
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
