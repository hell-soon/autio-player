<script setup lang="ts">
const model = defineModel<string>({ default: '' })

const props = withDefaults(defineProps<{
  type?: 'text' | 'search' | 'password'
  placeholder?: string
  autofocus?: boolean
  clearable?: boolean
  invalid?: boolean
  /** Клавиатура на телефоне: numeric — цифры (коды) */
  inputmode?: 'text' | 'numeric' | 'search'
  /** По умолчанию off; one-time-code — iPhone подставит код из SMS/уведомления */
  autocomplete?: string
  maxlength?: number | string
  /** Подпись для экранного диктора, если рядом нет видимой */
  ariaLabel?: string
}>(), {
  type: 'text',
})

const input = ref<HTMLInputElement | null>(null)
defineExpose({ focus: () => input.value?.focus() })

// HTML-атрибут autofocus срабатывает только при загрузке страницы, а не при переходе внутри сайта —
// иначе набранный текст уходит «в никуда», а пробел ставит музыку на паузу. На телефоне не фокусируем:
// клавиатура не должна выскакивать сама.
onMounted(() => {
  if (props.autofocus && window.matchMedia('(pointer: fine)').matches) input.value?.focus({ preventScroll: true })
})
</script>

<template>
  <label class="ui-input" :class="{ 'is-invalid': invalid }">
    <span v-if="$slots.icon" class="ui-input__icon"><slot name="icon" /></span>
    <input
      ref="input"
      v-model="model"
      class="ui-input__field"
      :type="type"
      :placeholder="placeholder"
      :autofocus="autofocus"
      :aria-invalid="invalid || undefined"
      :aria-label="ariaLabel"
      :inputmode="inputmode"
      :maxlength="maxlength"
      :autocomplete="autocomplete ?? 'off'"
      spellcheck="false"
    >
    <button
      v-if="clearable && model"
      type="button"
      class="ui-input__clear"
      aria-label="Очистить"
      @click="model = ''; input?.focus()"
    >
      ×
    </button>
  </label>
</template>

<style lang="scss" scoped>
.ui-input {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 44px;
  padding: 0 var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  background: var(--c-surface);
  cursor: text;
  transition:
    border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);

  @include hover {
    background: var(--c-surface-hover);
  }

  &:focus-within {
    border-color: var(--c-accent);
    background: var(--c-bg-elevated);
  }

  &.is-invalid {
    border-color: var(--c-danger);
  }

  &__icon {
    display: grid;
    color: var(--c-text-subtle);

    :deep(svg) {
      width: 18px;
      height: 18px;
    }
  }

  &__field {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    outline: 0;
    background: none;

    &::placeholder {
      color: var(--c-text-subtle);
    }

    &::-webkit-search-cancel-button {
      display: none;
    }
  }

  &__clear {
    @include reset-button;

    // Цель нажатия 32×32 — по крестику легко попасть пальцем
    display: grid;
    flex: none;
    place-items: center;
    width: 32px;
    height: 32px;
    margin-right: -6px;
    border-radius: 50%;
    font-size: 20px;
    line-height: 1;
    color: var(--c-text-subtle);

    @include hover {
      color: var(--c-text);
    }
  }
}
</style>
