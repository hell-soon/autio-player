<script setup lang="ts">
import { NAV_LINKS, SETTINGS_LINK, useUnseenShares } from '../model/links'

const links = [...NAV_LINKS, SETTINGS_LINK]
const { data: unseen } = useUnseenShares()
const route = useRoute()

/**
 * Раздел подсвечивается сразу в момент касания, не дожидаясь, пока откроется страница
 * (иначе меню «провисает»: палец уже убран, а выделение ещё на старом месте).
 */
const pending = ref<string | null>(null)
watch(() => route.path, () => (pending.value = null))

const matches = (to: string, path: string) => (to === '/' ? path === '/' : path.startsWith(to))
  || (to === '/library' && /^\/(playlist|liked|history|stats|collection\/smart)/.test(path))
const routeIndex = computed(() => pending.value !== null
  ? links.findIndex(l => l.to === pending.value)
  : links.findIndex(l => matches(l.to, route.path)))

/**
 * Перетаскивание подсветки (как в Telegram / YouTube): зажали палец на меню — «овал» приподнимается
 * и едет за пальцем, отпустили — открывается раздел под пальцем. Короткий тап — обычный переход по ссылке.
 * В режим перетаскивания: удержание 220 мс или сдвиг пальца по горизонтали больше 8 px.
 */
const nav = ref<HTMLElement | null>(null)
const dragPos = ref<number | null>(null) // дробный номер раздела под пальцем
let press: { id: number, x: number, timer: ReturnType<typeof setTimeout> } | null = null
let suppressClick = false

const activeIndex = computed(() => (dragPos.value !== null ? Math.round(dragPos.value) : routeIndex.value))

function posAt(clientX: number) {
  const el = nav.value
  if (!el) return 0
  const r = el.getBoundingClientRect()
  const pad = 5
  const cell = (r.width - pad * 2) / links.length
  return Math.min(links.length - 1, Math.max(0, (clientX - r.left - pad - cell / 2) / cell))
}
function startDrag(clientX: number) {
  if (!press) return
  nav.value?.setPointerCapture?.(press.id)
  dragPos.value = posAt(clientX)
}
function onPointerDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  const x = e.clientX
  press = { id: e.pointerId, x, timer: setTimeout(() => startDrag(x), 220) }
}
function onPointerMove(e: PointerEvent) {
  if (!press || e.pointerId !== press.id) return
  if (dragPos.value === null) {
    if (Math.abs(e.clientX - press.x) > 8) {
      clearTimeout(press.timer)
      startDrag(e.clientX)
    }
    return
  }
  const before = Math.round(dragPos.value)
  dragPos.value = posAt(e.clientX)
  // Лёгкий «щелчок» при переходе на соседний раздел (где браузер умеет вибрацию)
  if (Math.round(dragPos.value) !== before) navigator.vibrate?.(8)
}
function onPointerUp(e: PointerEvent) {
  if (!press || e.pointerId !== press.id) return
  clearTimeout(press.timer)
  press = null
  if (dragPos.value === null) return // обычный тап — сработает ссылка
  const target = links[Math.round(dragPos.value)]!
  dragPos.value = null
  suppressClick = true
  setTimeout(() => (suppressClick = false), 400)
  pending.value = target.to
  if (route.path !== target.to) navigateTo(target.to)
}
function onPointerCancel() {
  if (press) clearTimeout(press.timer)
  press = null
  dragPos.value = null
}
// После перетаскивания браузер может прислать click по ссылке, где палец начал движение, — гасим его
function onClickCapture(e: MouseEvent) {
  if (suppressClick) {
    e.preventDefault()
    e.stopPropagation()
  }
}
</script>

<template>
  <nav
    ref="nav"
    class="mobile-nav"
    :class="{ 'is-dragging': dragPos !== null }"
    aria-label="Основная навигация"
    :style="{ '--count': links.length }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @click.capture="onClickCapture"
    @contextmenu.prevent
  >
    <!-- Одна подсветка на всё меню — переезжает к выбранному разделу -->
    <span
      class="mobile-nav__indicator"
      :class="{ 'is-hidden': activeIndex < 0 }"
      :style="{ transform: `translateX(${(dragPos ?? Math.max(activeIndex, 0)) * 100}%)` }"
      aria-hidden="true"
    />
    <NuxtLink
      v-for="(l, i) in links"
      :key="l.to"
      :to="l.to"
      class="mobile-nav__link"
      :class="{ 'is-active': activeIndex === i }"
      :aria-current="activeIndex === i ? 'page' : undefined"
      draggable="false"
      @pointerdown="pending = l.to"
    >
      <span class="mobile-nav__icon">
        <component :is="l.icon" />
        <span v-if="l.to === '/friends' && unseen.count" class="mobile-nav__badge" :aria-label="`Прислали: ${unseen.count}`">{{ unseen.count }}</span>
      </span>
      <span class="mobile-nav__label">{{ l.label }}</span>
    </NuxtLink>
  </nav>
</template>

<style lang="scss" scoped>
// Плавающая «капсула», как мини-плеер над ней: со стеклом, тенью и отступами от краёв.
.mobile-nav {
  --pad: 5px;

  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--count), minmax(0, 1fr));
  height: var(--mobile-nav-height);
  margin: 0 var(--space-2);
  // Над полоской «домой» iPhone, но не впритык к ней
  margin-bottom: max(var(--space-2), calc(env(safe-area-inset-bottom) - 10px));
  padding: var(--pad);
  border: 1px solid var(--c-glass-border);
  border-radius: var(--radius-full);
  background: var(--c-panel-strong);
  box-shadow: var(--shadow-lg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  // Удержание — наше (перетаскивание подсветки): без системного меню ссылки, лупы и выделения на iOS
  touch-action: none;
  -webkit-touch-callout: none;
  user-select: none;

  &__indicator {
    position: absolute;
    top: var(--pad);
    bottom: var(--pad);
    left: var(--pad);
    width: calc((100% - var(--pad) * 2) / var(--count));
    border-radius: var(--radius-full);
    background: var(--c-accent-soft);
    transition:
      transform 0.38s cubic-bezier(0.3, 1.25, 0.5, 1),
      scale 0.3s cubic-bezier(0.3, 1.25, 0.5, 1),
      background-color 0.25s var(--ease),
      box-shadow 0.25s var(--ease),
      opacity var(--dur) var(--ease);
    pointer-events: none;

    &.is-hidden {
      opacity: 0;
    }
  }

  // Палец ведёт подсветку: она «приподнята» (крупнее, ярче, с тенью) и едет без задержки
  &.is-dragging &__indicator {
    background: color-mix(in srgb, var(--c-accent) 32%, transparent);
    box-shadow: 0 6px 18px color-mix(in srgb, var(--c-accent) 30%, transparent);
    transform-origin: center;
    // Короткое сглаживание: подсветка не прыгает к пальцу в момент удержания и не дрожит за ним
    transition:
      transform 0.1s linear,
      scale 0.2s var(--ease),
      background-color 0.2s var(--ease),
      box-shadow 0.2s var(--ease),
      opacity var(--dur) var(--ease);
    scale: 1.12 1.08;
  }

  &__link {
    position: relative;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 3px;
    min-width: 0;
    border-radius: var(--radius-full);
    color: var(--c-text-subtle);
    font-size: 10.5px;
    font-weight: 600;
    // Касание без серой вспышки iOS — отклик даёт сама подсветка
    -webkit-tap-highlight-color: transparent;
    transition: color 0.25s var(--ease);

    // Узкие экраны (iPhone SE): подписи не слипаются
    @media (max-width: 360px) {
      font-size: 9.5px;
      letter-spacing: -0.01em;
    }

    svg {
      width: 22px;
      height: 22px;
    }

    &.is-active {
      color: var(--c-text);

      svg {
        color: var(--c-accent);
        animation: nav-pop 0.4s cubic-bezier(0.3, 1.5, 0.5, 1);
      }
    }

    // Нажатие — лёгкое «вдавливание»
    &:active .mobile-nav__icon {
      transform: scale(0.86);
    }
  }

  &__label {
    @include truncate;

    max-width: 100%;
  }
}

.mobile-nav__icon {
  position: relative;
  display: grid;
  place-items: center;
  transition: transform var(--dur-fast) var(--ease);
}

.mobile-nav__badge {
  position: absolute;
  top: -4px;
  right: -10px;
  display: grid;
  place-items: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: var(--radius-full);
  background: var(--c-accent);
  color: var(--c-on-accent);
  font-size: 10px;
  font-weight: 700;
}

@keyframes nav-pop {
  40% {
    transform: translateY(-2px) scale(1.12);
  }
}
</style>
