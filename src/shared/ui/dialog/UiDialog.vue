<script setup lang="ts">
/** Модальное окно на нативном <dialog>: фокус-ловушка и Esc «из коробки». На телефоне — шторка снизу. */
const open = defineModel<boolean>('open', { required: true })
defineProps<{ title: string }>()

const el = ref<HTMLDialogElement | null>(null)

watch(open, (o) => {
  if (!el.value) return
  if (o && !el.value.open) el.value.showModal()
  if (!o && el.value.open) el.value.close()
}, { flush: 'post' })

onMounted(() => {
  if (open.value) el.value?.showModal()
})

function onBackdrop(e: MouseEvent) {
  if (e.target === el.value) open.value = false
}
</script>

<template>
  <dialog ref="el" class="ui-dialog" :aria-label="title" @close="open = false" @click="onBackdrop">
    <div class="ui-dialog__body">
      <h2 class="ui-dialog__title">
        {{ title }}
      </h2>
      <slot />
    </div>
  </dialog>
</template>

<style lang="scss" scoped>
.ui-dialog {
  width: min(420px, calc(100vw - 32px));
  max-height: min(70dvh, 560px);
  margin: auto;
  padding: 0;
  border: 1px solid var(--c-glass-border);
  border-radius: var(--radius-lg);
  background: var(--c-bg-elevated);
  color: var(--c-text);
  box-shadow: var(--shadow-lg);
  // Фокус при открытии получает само окно — рамка вокруг всего окна не нужна (у полей и кнопок своя)
  outline: none;

  &::backdrop {
    background: var(--c-overlay);
    backdrop-filter: blur(6px);
  }

  @include down(md) {
    width: 100vw;
    max-width: 100vw;
    // Шторка до самого низа экрана, в т.ч. в PWA на iPhone (--app-gap — plugins/viewport.client.ts)
    margin: auto 0 calc(-1 * var(--app-gap, 0px));
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    padding-bottom: env(safe-area-inset-bottom);
  }

  &__body {
    display: grid;
    gap: var(--space-4);
    padding: var(--space-5);
  }

  &__title {
    font-size: var(--fs-lg);
  }
}
</style>
