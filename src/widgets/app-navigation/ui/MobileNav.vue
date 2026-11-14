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
 * и едет за пальцем, отпустили — открывается раздел под пальцем. Короткий тап — переход сразу.
 *
 * Касания меню целиком наши (preventDefault на touchstart, тап тоже обрабатываем сами): иначе iOS при
 * удержании ссылки начинает её перетаскивание/предпросмотр и обрывает жест — подсветка «глючила».
 * Позиция — свойство translate (НЕ transform: transform применяется после scale «приподнятой» подсветки,
 * и сдвиг тоже увеличивался — подсветка обгоняла палец). Пишется напрямую в style раз за кадр (requestAnimationFrame), без CSS-переходов
 * и без перерисовки Vue: на 120 Гц экранах переходы, перезапускаемые на каждое движение, дают дрожание.
 * Мышь (компьютер; там меню скрыто) — обычные ссылки.
 */
const nav = ref<HTMLElement | null>(null)
const indicator = ref<HTMLElement | null>(null)
const dragging = ref(false)
const hoverIndex = ref(-1)
let touch: { id: number, x0: number, x: number, rect: DOMRect, startIndex: number, timer: ReturnType<typeof setTimeout> } | null = null
let frame = 0

const activeIndex = computed(() => (dragging.value ? hoverIndex.value : routeIndex.value))

const PAD = 5
function posAt(x: number, r: DOMRect) {
  const cell = (r.width - PAD * 2) / links.length
  return Math.min(links.length - 1, Math.max(0, (x - r.left - PAD - cell / 2) / cell))
}
function paint() {
  frame = 0
  if (!touch || !dragging.value || !indicator.value) return
  const pos = posAt(touch.x, touch.rect)
  indicator.value.style.translate = `${pos * 100}% 0`
  const i = Math.round(pos)
  if (i !== hoverIndex.value) {
    hoverIndex.value = i
    navigator.vibrate?.(8) // лёгкий «щелчок» на соседнем разделе (где браузер умеет)
  }
}
async function lift() {
  if (!touch || dragging.value) return
  hoverIndex.value = Math.round(posAt(touch.x, touch.rect))
  dragging.value = true
  await nextTick() // Vue уже убрал свой translate — дальше пишем сами
  const el = indicator.value
  if (!el || !touch) return
  // Подлёт к пальцу — коротко и плавно, дальше — точно за пальцем без задержки
  el.style.transition = 'translate 0.16s cubic-bezier(0.2, 0.8, 0.2, 1), scale 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease'
  el.style.translate = `${posAt(touch.x, touch.rect) * 100}% 0`
  setTimeout(() => {
    if (dragging.value && el) el.style.transition = 'scale 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease'
  }, 160)
}
function go(i: number) {
  const target = links[i]
  if (!target) return
  pending.value = target.to
  if (route.path !== target.to) navigateTo(target.to)
}
function release() {
  if (touch) clearTimeout(touch.timer)
  if (frame) cancelAnimationFrame(frame)
  frame = 0
  const el = indicator.value
  if (el) {
    // Отдаём подсветку обратно CSS: пружинкой доедет до раздела
    el.style.transition = ''
    el.style.translate = ''
  }
  dragging.value = false
}

function onTouchStart(e: TouchEvent) {
  const t = e.changedTouches[0]
  if (!t || touch || !nav.value) return
  e.preventDefault() // без системного удержания ссылки (перетаскивание, предпросмотр, лупа)
  const rect = nav.value.getBoundingClientRect()
  const startIndex = Math.round(posAt(t.clientX, rect))
  touch = { id: t.identifier, x0: t.clientX, x: t.clientX, rect, startIndex, timer: setTimeout(lift, 200) }
  pressed.value = startIndex
}
function onTouchMove(e: TouchEvent) {
  const t = [...e.changedTouches].find(x => x.identifier === touch?.id)
  if (!t || !touch) return
  e.preventDefault()
  touch.x = t.clientX
  if (!dragging.value) {
    if (Math.abs(t.clientX - touch.x0) > 8) {
      clearTimeout(touch.timer)
      lift()
    }
    return
  }
  if (!frame) frame = requestAnimationFrame(paint)
}
function onTouchEnd(e: TouchEvent) {
  if (!touch || ![...e.changedTouches].some(x => x.identifier === touch!.id)) return
  e.preventDefault()
  const i = dragging.value ? Math.round(posAt(touch.x, touch.rect)) : touch.startIndex
  release()
  touch = null
  pressed.value = -1
  go(i)
}
function onTouchCancel() {
  release()
  touch = null
  pressed.value = -1
}
/** Нажатый (палец на нём) раздел — для «вдавливания» иконки (у нас свой :active — системный отключён preventDefault) */
const pressed = ref(-1)
onBeforeUnmount(() => {
  if (touch) clearTimeout(touch.timer)
  if (frame) cancelAnimationFrame(frame)
})
</script>

<template>
  <nav
    ref="nav"
    class="mobile-nav"
    :class="{ 'is-dragging': dragging }"
    aria-label="Основная навигация"
    :style="{ '--count': links.length }"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchCancel"
    @contextmenu.prevent
  >
    <!-- Одна подсветка на всё меню — переезжает к выбранному разделу -->
    <span
      ref="indicator"
      class="mobile-nav__indicator"
      :class="{ 'is-hidden': activeIndex < 0 }"
      :style="dragging ? undefined : { translate: `${Math.max(activeIndex, 0) * 100}% 0` }"
      aria-hidden="true"
    />
    <NuxtLink
      v-for="(l, i) in links"
      :key="l.to"
      :to="l.to"
      class="mobile-nav__link"
      :class="{ 'is-active': activeIndex === i, 'is-pressed': pressed === i && !dragging }"
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
    // Свой слой на видеокарте: движение не перерисовывает стеклянное меню под ней
    will-change: translate, scale;
    transition:
      translate 0.38s cubic-bezier(0.3, 1.25, 0.5, 1),
      scale 0.3s cubic-bezier(0.3, 1.25, 0.5, 1),
      background-color 0.25s var(--ease),
      box-shadow 0.25s var(--ease),
      opacity var(--dur) var(--ease);
    pointer-events: none;

    &.is-hidden {
      opacity: 0;
    }
  }

  // Палец ведёт подсветку: она «приподнята» (крупнее, ярче, с тенью). Позицию пишет script (rAF), без переходов
  &.is-dragging &__indicator {
    background: color-mix(in srgb, var(--c-accent) 32%, transparent);
    box-shadow: 0 6px 18px color-mix(in srgb, var(--c-accent) 30%, transparent);
    scale: 1.12 1.08;
  }

  // Пока ведут пальцем — иконки не подпрыгивают на каждом разделе, только меняют цвет
  &.is-dragging &__link.is-active svg {
    animation: none;
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
    // Касание без серой вспышки iOS — отклик даёт сама подсветка; ссылку нельзя «поднять» и перетащить
    -webkit-tap-highlight-color: transparent;
    -webkit-user-drag: none;
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

    // Нажатие — лёгкое «вдавливание» (своё состояние: системный :active погашен preventDefault)
    &.is-pressed .mobile-nav__icon {
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
