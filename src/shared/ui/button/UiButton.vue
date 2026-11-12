<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import UiSpinner from '../spinner/UiSpinner.vue'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  to?: RouteLocationRaw
  /** Обычная ссылка (полная перезагрузка), например на /api/auth/... */
  external?: boolean
  type?: 'button' | 'submit'
  loading?: boolean
  disabled?: boolean
  block?: boolean
}>(), {
  variant: 'secondary',
  size: 'md',
  type: 'button',
})

const NuxtLink = resolveComponent('NuxtLink')
const tag = computed(() => (props.to ? NuxtLink : 'button'))
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :external="to ? external : undefined"
    :type="to ? undefined : type"
    :disabled="to ? undefined : disabled || loading"
    class="ui-button"
    :class="[`ui-button--${variant}`, `ui-button--${size}`, { 'ui-button--block': block, 'is-loading': loading }]"
  >
    <UiSpinner v-if="loading" class="ui-button__spinner" />
    <slot name="icon" />
    <span v-if="$slots.default" class="ui-button__label"><slot /></span>
  </component>
</template>

<style lang="scss" scoped>
.ui-button {
  @include reset-button;
  @include focus-ring;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border-radius: var(--radius-full);
  font-weight: 600;
  white-space: nowrap;
  transition:
    background-color var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease),
    opacity var(--dur-fast);

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :deep(svg) {
    width: 1.15em;
    height: 1.15em;
    flex: none;
  }

  &--sm {
    height: 32px;
    padding: 0 var(--space-3);
    font-size: var(--fs-sm);
  }

  &--md {
    height: 40px;
    padding: 0 var(--space-4);
    font-size: var(--fs-md);
  }

  &--lg {
    height: 48px;
    padding: 0 var(--space-5);
    font-size: var(--fs-lg);
  }

  &--block {
    display: flex;
    width: 100%;
  }

  &--primary {
    background: var(--c-accent);
    color: var(--c-on-accent);

    @include hover {
      background: color-mix(in srgb, var(--c-accent) 88%, var(--c-text));
    }
  }

  &--secondary {
    background: var(--c-surface);

    @include hover {
      background: var(--c-surface-hover);
    }
  }

  &--ghost {
    color: var(--c-text-muted);

    @include hover {
      background: var(--c-surface);
      color: var(--c-text);
    }
  }

  &--danger {
    background: color-mix(in srgb, var(--c-danger) 14%, transparent);
    color: var(--c-danger);

    @include hover {
      background: color-mix(in srgb, var(--c-danger) 22%, transparent);
    }
  }
}
</style>
