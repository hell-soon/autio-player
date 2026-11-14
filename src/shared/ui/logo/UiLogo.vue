<script setup lang="ts">
/**
 * Логотип приложения: «волна» из полосок на плашке акцентного цвета (как иконка приложения).
 * animated — полоски покачиваются, как эквалайзер (загрузочный экран, приветствие).
 */
withDefaults(defineProps<{ size?: number, animated?: boolean }>(), { size: 104, animated: true })
// Пропорции полосок — как на иконке приложения
const BARS = [0.3, 0.55, 0.8, 1, 0.8, 0.55, 0.3]
</script>

<template>
  <span class="ui-logo" :class="{ 'is-animated': animated }" :style="{ '--s': `${size}px` }" aria-hidden="true">
    <i v-for="(h, i) in BARS" :key="i" :style="{ '--h': h, '--i': i }" />
  </span>
</template>

<style lang="scss" scoped>
.ui-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  gap: calc(var(--s) * 0.067);
  width: var(--s);
  height: var(--s);
  border-radius: calc(var(--s) * 0.27);
  background: linear-gradient(145deg, var(--c-accent), color-mix(in srgb, var(--c-accent) 70%, var(--c-bg)));
  box-shadow: 0 calc(var(--s) * 0.17) calc(var(--s) * 0.48) color-mix(in srgb, var(--c-accent) 35%, transparent);

  i {
    width: calc(var(--s) * 0.067);
    height: calc(var(--s) * 0.54 * var(--h));
    border-radius: calc(var(--s) * 0.04);
    background: var(--c-on-accent);
    transform-origin: center;
  }

  &.is-animated i {
    animation: ui-logo-bar 1.1s ease-in-out calc(var(--i) * -0.14s) infinite;
  }
}

@keyframes ui-logo-bar {
  0%,
  100% {
    transform: scaleY(1);
  }

  50% {
    transform: scaleY(0.55);
  }
}
</style>
