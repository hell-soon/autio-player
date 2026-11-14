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
const activeIndex = computed(() => {
  const i = pending.value !== null
    ? links.findIndex(l => l.to === pending.value)
    : links.findIndex(l => matches(l.to, route.path))
  return i
})
</script>

<template>
  <nav class="mobile-nav" aria-label="Основная навигация" :style="{ '--count': links.length }">
    <!-- Одна подсветка на всё меню — переезжает к выбранному разделу -->
    <span
      class="mobile-nav__indicator"
      :class="{ 'is-hidden': activeIndex < 0 }"
      :style="{ transform: `translateX(${Math.max(activeIndex, 0) * 100}%)` }"
      aria-hidden="true"
    />
    <NuxtLink
      v-for="(l, i) in links"
      :key="l.to"
      :to="l.to"
      class="mobile-nav__link"
      :class="{ 'is-active': activeIndex === i }"
      :aria-current="activeIndex === i ? 'page' : undefined"
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
      opacity var(--dur) var(--ease);
    pointer-events: none;

    &.is-hidden {
      opacity: 0;
    }
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
