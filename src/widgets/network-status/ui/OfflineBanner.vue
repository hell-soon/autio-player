<script setup lang="ts">
import { Wifi, WifiOff } from 'lucide-vue-next'

/**
 * «Нет соединения» — вместо россыпи ошибок загрузки, когда пропала сеть (метро, лифт).
 * Музыка из кэша следующих треков продолжает играть. При возврате сети — короткое «Снова в сети».
 */
const offline = ref(false)
const back = ref(false)
let backTimer: ReturnType<typeof setTimeout> | undefined

function update() {
  const now = !navigator.onLine
  if (offline.value && !now) {
    back.value = true
    clearTimeout(backTimer)
    backTimer = setTimeout(() => (back.value = false), 2500)
  }
  offline.value = now
}

onMounted(() => {
  update()
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', update)
  window.removeEventListener('offline', update)
  clearTimeout(backTimer)
})
</script>

<template>
  <Transition name="net">
    <div v-if="offline" class="net is-offline" role="status">
      <WifiOff />
      <span>Нет соединения — играет то, что уже загружено</span>
    </div>
    <div v-else-if="back" class="net is-back" role="status">
      <Wifi />
      <span>Снова в сети</span>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.net {
  position: fixed;
  top: calc(var(--space-3) + env(safe-area-inset-top));
  left: 50%;
  z-index: 90;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  max-width: calc(100vw - var(--space-6));
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-lg);
  font-size: var(--fs-sm);
  font-weight: 600;
  transform: translateX(-50%);

  svg {
    flex: none;
    width: 16px;
    height: 16px;
  }

  span {
    @include truncate;
  }

  &.is-offline {
    background: var(--c-text);
    color: var(--c-bg);
  }

  &.is-back {
    background: var(--c-accent);
    color: var(--c-on-accent);
  }
}

.net-enter-active,
.net-leave-active {
  transition: opacity var(--dur) var(--ease), transform var(--dur) var(--ease);
}

.net-enter-from,
.net-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}
</style>
