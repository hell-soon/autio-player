<script setup lang="ts">
/**
 * Загрузочный экран: приходит уже в HTML с сервера (виден с первого кадра, в цветах темы — без вспышки),
 * исчезает, когда приложение ожило (гидрация), но не раньше чем через ~0,5 с — чтобы не мигал.
 * Только при открытии сайта/PWA: переходы внутри приложения его не показывают.
 * Если скрипт не загрузился — CSS сам уберёт экран через 6 с (сайт не останется закрытым).
 */
import { UiLogo } from '@/shared/ui'

const MIN_MS = 500
const state = ref<'shown' | 'leaving' | 'gone'>('shown')
onMounted(() => {
  // onMounted корня срабатывает после гидрации (Suspense приложения разрешился)
  const wait = Math.max(0, MIN_MS - performance.now())
  setTimeout(() => {
    state.value = 'leaving'
    setTimeout(() => (state.value = 'gone'), 420)
  }, wait)
})
</script>

<template>
  <div v-if="state !== 'gone'" class="splash" :class="{ 'is-leaving': state === 'leaving' }" aria-hidden="true">
    <UiLogo class="splash__logo" />
    <span class="splash__name">Audio</span>
  </div>
</template>

<style lang="scss" scoped>
.splash {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: var(--space-5);
  background: var(--c-bg);
  // Страховка: если JS не ожил — экран всё равно уйдёт
  animation: splash-out 0.4s var(--ease) 6s forwards;

  &.is-leaving {
    animation: splash-out 0.4s var(--ease) forwards;
  }

  &__logo {
    animation: splash-logo-in 0.5s cubic-bezier(0.3, 1.3, 0.5, 1) both;
  }

  &__name {
    color: var(--c-text);
    font-size: var(--fs-lg);
    font-weight: 800;
    letter-spacing: -0.02em;
    animation: splash-name-in 0.5s var(--ease) 0.15s both;
  }

  // Уход: плашка чуть увеличивается, всё растворяется
  &.is-leaving &__logo {
    animation: splash-logo-out 0.4s var(--ease) forwards;
  }
}

@keyframes splash-logo-in {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
}

@keyframes splash-name-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

@keyframes splash-logo-out {
  to {
    transform: scale(1.15);
  }
}

@keyframes splash-out {
  to {
    opacity: 0;
    visibility: hidden;
  }
}
</style>
