<script setup lang="ts">
import { NAV_LINKS, SETTINGS_LINK } from '../model/links'

const links = [...NAV_LINKS, SETTINGS_LINK]
const route = useRoute()
const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to)
  || (to === '/library' && /^\/(playlist|liked)/.test(route.path)))
</script>

<template>
  <nav class="mobile-nav" aria-label="Основная навигация">
    <NuxtLink v-for="l in links" :key="l.to" :to="l.to" class="mobile-nav__link" :class="{ 'is-active': isActive(l.to) }">
      <component :is="l.icon" />
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

    span {
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
      }
    }
  }
}
</style>
