<script setup lang="ts">
import { NAV_LINKS, SETTINGS_LINK, useUnseenShares } from '../model/links'

const links = [...NAV_LINKS, SETTINGS_LINK]
const { data: unseen } = useUnseenShares()
const route = useRoute()
const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to)
  || (to === '/library' && /^\/(playlist|liked)/.test(route.path)))
</script>

<template>
  <nav class="mobile-nav" aria-label="Основная навигация">
    <NuxtLink v-for="l in links" :key="l.to" :to="l.to" class="mobile-nav__link" :class="{ 'is-active': isActive(l.to) }">
      <span class="mobile-nav__icon">
        <component :is="l.icon" />
        <span v-if="l.to === '/friends' && unseen.count" class="mobile-nav__badge" :aria-label="`Прислали: ${unseen.count}`">{{ unseen.count }}</span>
      </span>
      <span>{{ l.label }}</span>
    </NuxtLink>
  </nav>
</template>

<style lang="scss" scoped>
.mobile-nav {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  height: calc(var(--mobile-nav-height) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 1px solid var(--c-glass-border);
  background: var(--c-panel-strong);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);

  &__link {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 2px;
    color: var(--c-text-subtle);
    min-width: 0;
    font-size: 11px;
    font-weight: 500;

    // Подпись (не иконка: у неё «пилюля» и значок выходят за края)
    > span:last-child {
      @include truncate;

      max-width: 100%;
    }

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
      transform: scale(0.88);
    }
  }
}

@keyframes nav-pop {
  40% {
    transform: translateY(-3px) scale(1.12);
  }
}

.mobile-nav__icon {
  position: relative;
  display: grid;
  place-items: center;
  isolation: isolate;
  transition: transform var(--dur-fast) var(--ease);

  // «Пилюля» под иконкой выбранного раздела
  &::before {
    content: '';
    position: absolute;
    inset: -4px -14px;
    z-index: -1;
    border-radius: var(--radius-full);
    background: var(--c-accent-soft);
    opacity: 0;
    transform: scaleX(0.4);
    transition: opacity 0.25s var(--ease), transform 0.35s cubic-bezier(0.3, 1.3, 0.5, 1);
  }

  .is-active > &::before {
    opacity: 1;
    transform: none;
  }
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
</style>
