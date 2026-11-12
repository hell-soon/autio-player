<script setup lang="ts">
withDefaults(defineProps<{
  /** Обязателен: у кнопки без текста должна быть подпись для скринридеров */
  label: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'ghost' | 'filled' | 'accent'
  active?: boolean
  disabled?: boolean
}>(), {
  size: 'md',
  variant: 'ghost',
})
</script>

<template>
  <button
    type="button"
    class="ui-icon-button"
    :class="[`ui-icon-button--${size}`, `ui-icon-button--${variant}`, { 'is-active': active }]"
    :aria-label="label"
    :title="label"
    :aria-pressed="active === undefined ? undefined : active"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style lang="scss" scoped>
.ui-icon-button {
  @include reset-button;
  @include focus-ring;

  display: inline-grid;
  place-items: center;
  flex: none;
  border-radius: var(--radius-full);
  color: var(--c-text-muted);
  transition:
    color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);

  &:active:not(:disabled) {
    transform: scale(0.92);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  :deep(svg) {
    width: 55%;
    height: 55%;
  }

  &--sm {
    width: 32px;
    height: 32px;
  }

  &--md {
    width: 40px;
    height: 40px;
  }

  &--lg {
    width: 48px;
    height: 48px;
  }

  &--ghost {
    @include hover {
      color: var(--c-text);
    }
  }

  &--filled {
    background: var(--c-surface);
    color: var(--c-text);

    @include hover {
      background: var(--c-surface-hover);
    }
  }

  &--accent {
    background: var(--c-accent);
    color: var(--c-on-accent);

    @include hover {
      transform: scale(1.04);
    }
  }

  &.is-active {
    color: var(--c-accent);
  }
}
</style>
