<script setup lang="ts">
/**
 * Загрузочный экран: приходит уже в HTML с сервера (виден с первого кадра, в цветах темы — без вспышки),
 * исчезает, когда приложение ожило (гидрация), но не раньше чем через ~0,5 с — чтобы не мигал.
 * Только при открытии сайта/PWA: переходы внутри приложения его не показывают.
 * Если скрипт не загрузился — CSS сам уберёт экран через 6 с (сайт не останется закрытым).
 */
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
// Пропорции полосок — как на иконке приложения
const BARS = [0.3, 0.55, 0.8, 1, 0.8, 0.55, 0.3]
</script>

<template>
  <div v-if="state !== 'gone'" class="splash" :class="{ 'is-leaving': state === 'leaving' }" aria-hidden="true">
    <div class="splash__logo">
      <i v-for="(h, i) in BARS" :key="i" :style="{ '--h': h, '--i': i }" />
    </div>
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

  // Логотип: «волна» из полосок на плашке акцентного цвета
  &__logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    width: 104px;
    height: 104px;
    border-radius: 28px;
    background: linear-gradient(145deg, var(--c-accent), color-mix(in srgb, var(--c-accent) 70%, var(--c-bg)));
    box-shadow: 0 18px 50px color-mix(in srgb, var(--c-accent) 35%, transparent);
    animation: splash-logo-in 0.5s cubic-bezier(0.3, 1.3, 0.5, 1) both;

    i {
      width: 7px;
      height: calc(56px * var(--h));
      border-radius: 4px;
      background: var(--c-on-accent);
      transform-origin: center;
      animation: splash-bar 1.1s ease-in-out calc(var(--i) * -0.14s) infinite;
    }
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

@keyframes splash-bar {
  0%,
  100% {
    transform: scaleY(1);
  }

  50% {
    transform: scaleY(0.55);
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
