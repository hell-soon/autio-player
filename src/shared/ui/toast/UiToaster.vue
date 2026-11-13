<script setup lang="ts">
import { useToast } from './toast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="toaster" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="[`is-${t.tone}`, { 'has-action': t.action }]">
        <span>{{ t.text }}</span>
        <button v-if="t.action" type="button" class="toast__action" @click="t.action.run(); dismiss(t.id)">
          {{ t.action.label }}
        </button>
        <button v-if="t.action" type="button" class="toast__close" aria-label="Закрыть" @click="dismiss(t.id)">
          ×
        </button>
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
    // --app-gap: в PWA на iPhone низ экрана ниже, чем считает браузер (plugins/viewport.client.ts)
    bottom: calc(var(--mobile-nav-height) + var(--mini-player-height) + env(safe-area-inset-bottom) + var(--space-5) - var(--app-gap, 0px));
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

  // С кнопкой — кликабельно и может переноситься на узком экране
  &.has-action {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    max-width: calc(100vw - var(--space-6));
    padding-right: var(--space-2);
    white-space: normal;
    pointer-events: auto;
  }

  &__action,
  &__close {
    @include reset-button;
    @include focus-ring;

    flex: none;
    min-height: 32px;
    border-radius: var(--radius-full);
    font-weight: 700;
  }

  &__action {
    padding: 0 var(--space-3);
    background: var(--c-accent);
    color: var(--c-on-accent);
  }

  &__close {
    width: 32px;
    font-size: 18px;
    opacity: 0.6;
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
