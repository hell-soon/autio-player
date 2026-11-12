<script setup lang="ts">
import { useToast } from './toast'

const { toasts } = useToast()
</script>

<template>
  <div class="toaster" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="`is-${t.tone}`">
        {{ t.text }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style lang="scss" scoped>
.toaster {
  position: fixed;
  left: 50%;
  bottom: calc(var(--player-height) + var(--space-6));
  z-index: 100;
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  transform: translateX(-50%);
  pointer-events: none;

  @include down(md) {
    bottom: calc(var(--mobile-nav-height) + var(--mini-player-height) + env(safe-area-inset-bottom) + var(--space-5));
  }
}

.toast {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  background: var(--c-text);
  color: var(--c-bg);
  font-size: var(--fs-sm);
  font-weight: 500;
  box-shadow: var(--shadow-lg);
  white-space: nowrap;

  &.is-error {
    background: var(--c-danger);
    color: #fff;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity var(--dur) var(--ease), transform var(--dur) var(--ease);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
