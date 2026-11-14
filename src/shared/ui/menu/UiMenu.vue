<script setup lang="ts">
/**
 * Выпадающее меню. Позиционируется fixed относительно кнопки и переворачивается,
 * если не помещается снизу/справа. Закрывается по клику вне, Esc и прокрутке.
 */
import type { UiMenuItem } from './types'

defineProps<{ items: UiMenuItem[], label: string }>()

const open = ref(false)
const trigger = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const pos = ref({ top: 0, left: 0, origin: 'top right' })

async function toggle() {
  open.value = !open.value
  if (!open.value) return
  await nextTick()
  place()
  menu.value?.querySelector<HTMLElement>('button')?.focus()
}

function place() {
  const t = trigger.value!.getBoundingClientRect()
  // offset*, а не getBoundingClientRect: во время появления меню уменьшено transform-ом
  const m = { width: menu.value!.offsetWidth, height: menu.value!.offsetHeight }
  const gap = 6
  let top = t.bottom + gap
  if (top + m.height > window.innerHeight - 8) top = Math.max(8, t.top - m.height - gap)
  let left = t.right - m.width
  if (left < 8) left = Math.min(t.left, window.innerWidth - m.width - 8)
  // Меню «вырастает» из кнопки, которая его открыла
  const ox = Math.min(m.width, Math.max(0, (t.left + t.right) / 2 - left))
  pos.value = { top, left, origin: `${ox}px ${top >= t.bottom ? 0 : m.height}px` }
}

function close() {
  open.value = false
}

function run(item: UiMenuItem) {
  close()
  item.action()
}

function onDocPointer(e: PointerEvent) {
  const target = e.target as Node
  if (!menu.value?.contains(target) && !trigger.value?.contains(target)) close()
}

watch(open, (o) => {
  if (o) {
    document.addEventListener('pointerdown', onDocPointer, true)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
  }
  else {
    document.removeEventListener('pointerdown', onDocPointer, true)
    window.removeEventListener('scroll', close, true)
    window.removeEventListener('resize', close)
  }
})
onBeforeUnmount(close)

defineExpose({ close })
</script>

<template>
  <span class="ui-menu">
    <span ref="trigger" class="ui-menu__trigger" @click.stop="toggle">
      <slot :open="open" />
    </span>
    <Teleport to="body">
      <Transition name="menu">
        <div
          v-if="open"
          ref="menu"
          class="ui-menu__panel"
          role="menu"
          :aria-label="label"
          :style="{ top: `${pos.top}px`, left: `${pos.left}px`, transformOrigin: pos.origin }"
          @keydown.esc="close"
        >
          <button
            v-for="item in items"
            :key="item.label"
            type="button"
            role="menuitem"
            class="ui-menu__item"
            :class="{ 'is-danger': item.danger }"
            @click="run(item)"
          >
            <component :is="item.icon" v-if="item.icon" />
            {{ item.label }}
          </button>
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<style lang="scss" scoped>
.ui-menu {
  display: inline-flex;

  &__trigger {
    display: inline-flex;
  }

  &__panel {
    @include glass(true);

    position: fixed;
    z-index: 200;
    display: grid;
    min-width: 220px;
    padding: var(--space-1);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
  }

  &__item {
    @include reset-button;

    display: flex;
    align-items: center;
    gap: var(--space-3);
    height: 38px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-sm);
    font-size: var(--fs-sm);
    text-align: left;

    svg {
      width: 16px;
      height: 16px;
      color: var(--c-text-muted);
    }

    &:hover,
    &:focus-visible {
      outline: none;
      background: var(--c-surface-hover);
    }

    &.is-danger,
    &.is-danger svg {
      color: var(--c-danger);
    }
  }
}

.menu-enter-active {
  transition: opacity 0.16s var(--ease), transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1.15);
}

.menu-leave-active {
  transition: opacity var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease);
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: scale(0.92) translateY(-4px);
}
</style>
