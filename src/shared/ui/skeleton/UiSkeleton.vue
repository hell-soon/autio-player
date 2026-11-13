<script setup lang="ts">
/** Заглушка на время загрузки: блок с мягким переливом (страница не «прыгает», когда приходят данные). */
withDefaults(defineProps<{ width?: string, height?: string, radius?: string, circle?: boolean }>(), {
  width: '100%',
  height: '1em',
  radius: 'var(--radius-sm)',
})
</script>

<template>
  <span class="ui-skeleton" :style="{ width, height: circle ? width : height, borderRadius: circle ? '50%' : radius }" aria-hidden="true" />
</template>

<style lang="scss" scoped>
.ui-skeleton {
  display: block;
  flex: none;
  background: linear-gradient(90deg, var(--c-surface) 25%, var(--c-surface-hover) 50%, var(--c-surface) 75%);
  background-size: 300% 100%;
  animation: ui-skeleton 1.4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
}

@keyframes ui-skeleton {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: 0 0;
  }
}
</style>
