<script setup lang="ts">
const model = defineModel<boolean>({ required: true })
defineProps<{ label: string, description?: string }>()
</script>

<template>
  <label class="ui-switch">
    <span class="ui-switch__text">
      <span>{{ label }}</span>
      <span v-if="description" class="ui-switch__desc">{{ description }}</span>
    </span>
    <input v-model="model" type="checkbox" role="switch" class="ui-switch__input">
    <span class="ui-switch__track" aria-hidden="true"><span class="ui-switch__thumb" /></span>
  </label>
</template>

<style lang="scss" scoped>
.ui-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  cursor: pointer;

  &__text {
    display: grid;
  }

  &__desc {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__input {
    @include visually-hidden;
  }

  &__track {
    position: relative;
    flex: none;
    width: 44px;
    height: 26px;
    border-radius: var(--radius-full);
    background: var(--c-surface-active);
    transition: background-color var(--dur) var(--ease);
  }

  &__thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
    transition: transform var(--dur) var(--ease);
  }

  &__input:checked + &__track {
    background: var(--c-accent);
  }

  &__input:checked + &__track &__thumb {
    transform: translateX(18px);
  }

  &__input:focus-visible + &__track {
    outline: 2px solid var(--c-accent);
    outline-offset: 2px;
  }
}
</style>
