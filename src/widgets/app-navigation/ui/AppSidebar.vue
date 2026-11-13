<script setup lang="ts">
import { AudioLines } from 'lucide-vue-next'
import { NAV_LINKS, RAIL_EXTRA_LINKS, SETTINGS_LINK, useUnseenShares } from '../model/links'

const links = [...NAV_LINKS, ...RAIL_EXTRA_LINKS]
const { data: unseen } = useUnseenShares()

const route = useRoute()
// Библиотека подсвечивается и на страницах плейлистов/любимого.
const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to)
  || (to === '/library' && /^\/(playlist|liked)/.test(route.path)))
</script>

<template>
  <aside class="rail">
    <NuxtLink to="/" class="rail__logo" aria-label="Audio — на главную">
      <AudioLines />
    </NuxtLink>

    <nav aria-label="Основная навигация" class="rail__nav">
      <NuxtLink
        v-for="l in links"
        :key="l.to"
        :to="l.to"
        class="rail__link"
        :class="{ 'is-active': isActive(l.to) }"
        :aria-label="l.label"
        :title="l.label"
      >
        <component :is="l.icon" />
        <span v-if="l.to === '/friends' && unseen.count" class="rail__badge" :aria-label="`Прислали: ${unseen.count}`">{{ unseen.count }}</span>
      </NuxtLink>
    </nav>

    <NuxtLink
      :to="SETTINGS_LINK.to"
      class="rail__link rail__settings"
      :class="{ 'is-active': isActive(SETTINGS_LINK.to) }"
      :aria-label="SETTINGS_LINK.label"
      :title="SETTINGS_LINK.label"
    >
      <component :is="SETTINGS_LINK.icon" />
    </NuxtLink>
  </aside>
</template>

<style lang="scss" scoped>
.rail {
  @include glass;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-5);
  height: 100%;
  padding: var(--space-4) 0;
  border-radius: var(--radius-lg);

  &__logo {
    @include focus-ring;

    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: var(--c-accent);
    color: var(--c-on-accent);

    svg {
      width: 22px;
      height: 22px;
    }
  }

  &__nav {
    display: grid;
    gap: var(--space-2);
  }

  &__link {
    @include focus-ring;

    position: relative;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    color: var(--c-text-subtle);
    transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);

    svg {
      width: 22px;
      height: 22px;
    }

    @include hover {
      background: var(--c-surface);
      color: var(--c-text);
    }

    &.is-active {
      background: var(--c-surface-hover);
      color: var(--c-accent);
    }
  }

  &__settings {
    margin-top: auto;
  }
}

.rail__link {
  position: relative;
}

// Значок «прислали треки» на «Друзьях»
.rail__badge {
  position: absolute;
  top: 2px;
  right: 2px;
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
