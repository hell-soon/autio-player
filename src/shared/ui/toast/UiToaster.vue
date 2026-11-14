<script setup lang="ts">
import { useToast } from './toast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="toaster" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="[`is-${t.tone}`, { 'has-action': t.action }]">
        <span class="toast__text">{{ t.text }}</span>
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
  // На всю ширину с отступами, уведомления — по центру. НЕ left: 50% + translateX(-50%):
  // тогда браузер даёт блоку не больше половины экрана и текст с кнопкой ломается по слову в строку.
  position: fixed;
  right: var(--space-3);
  left: var(--space-3);
  bottom: calc(var(--player-height) + var(--space-6));
  z-index: 100;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
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
  // Длинный текст без кнопки — многоточие, а не за край экрана
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;

  &.is-error {
    background: var(--c-danger);
    color: #fff;
  }

  // С кнопкой — кликабельно и может переноситься на узком экране
  &.has-action {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    max-width: min(100%, 520px);
    padding-right: var(--space-2);
    border-radius: 22px;
    white-space: normal;
    pointer-events: auto;
  }

  // Длинный текст («Играет альбом «…»») — не больше двух строк, кнопки не сжимаются
  &__text {
    display: -webkit-box;
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
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
