<script setup lang="ts">
import { Laptop, MonitorSpeaker, Smartphone, Speaker, Tablet, Tv, Volume2 } from 'lucide-vue-next'
import { usePlayer } from '@/entities/player'
import { UiIconButton } from '@/shared/ui'

/** Выбор устройства для воспроизведения (как Spotify Connect). */
withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'sm' })
const p = usePlayer()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
// Панель вынесена в <body> (плеер обрезает содержимое) и ставится над кнопкой.
const pos = ref({ bottom: 0, right: 0 })

function toggleOpen() {
  if (!open.value && root.value) {
    const r = root.value.getBoundingClientRect()
    pos.value = { bottom: window.innerHeight - r.top + 12, right: Math.max(12, window.innerWidth - r.right) }
  }
  open.value = !open.value
  // Устройства Spotify Connect подгружаем при открытии (чтобы не дёргать API Spotify постоянно).
  if (open.value) p.loadSpotifyDevices()
}

const icons = { computer: Laptop, phone: Smartphone, tablet: Tablet, speaker: Speaker, tv: Tv } as const

// Активное устройство: то, которым управляем, иначе это.
const activeId = computed(() => p.controlling.value ?? p.selfDeviceId.value)
const list = computed(() => {
  const self = p.selfDeviceId.value
  return [...p.devices.value].sort((a, b) => (a.id === self ? -1 : b.id === self ? 1 : b.lastSeen - a.lastSeen))
})
const others = computed(() => p.devices.value.filter(d => d.id !== p.selfDeviceId.value).length)

function pick(id: string) {
  open.value = false
  if (id !== activeId.value) p.transferTo(id)
}

function onDoc(e: PointerEvent) {
  const t = e.target as Node
  if (!root.value?.contains(t) && !panel.value?.contains(t)) open.value = false
}
const close = () => (open.value = false)
watch(open, (o) => {
  if (o) {
    document.addEventListener('pointerdown', onDoc, true)
    window.addEventListener('resize', close)
  }
  else {
    document.removeEventListener('pointerdown', onDoc, true)
    window.removeEventListener('resize', close)
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDoc, true)
  window.removeEventListener('resize', close)
})
</script>

<template>
  <div ref="root" class="picker">
    <UiIconButton
      :label="p.controlling.value ? `Играет на «${p.remoteDevice.value?.name}»` : 'Устройства'"
      :size="size"
      :active="!!p.controlling.value"
      class="picker__btn"
      @click="toggleOpen"
    >
      <MonitorSpeaker />
      <span v-if="others && !p.controlling.value" class="picker__dot" aria-hidden="true" />
    </UiIconButton>

    <Teleport to="body">
      <Transition name="pop">
        <div
          v-if="open"
          ref="panel"
          class="picker__panel"
          role="dialog"
          aria-label="Выбор устройства"
          :style="{ bottom: `${pos.bottom}px`, right: `${pos.right}px` }"
          @keydown.esc="close"
        >
        <div class="picker__title">
          Где слушать
        </div>
        <button
          v-for="d in list"
          :key="d.id"
          type="button"
          class="device"
          :class="{ 'is-active': d.id === activeId }"
          @click="pick(d.id)"
        >
          <span class="device__icon">
            <Volume2 v-if="d.id === activeId" />
            <component :is="icons[d.kind]" v-else />
          </span>
          <span class="device__text">
            <span class="device__name">{{ d.name }}{{ d.id === p.selfDeviceId.value ? ' (это устройство)' : '' }}</span>
            <span v-if="d.spotify" class="device__badge">Spotify Connect</span>
            <span class="device__sub">
              <template v-if="d.state?.track">{{ d.state.isPlaying ? 'Играет' : 'На паузе' }}: {{ d.state.track.title }}</template>
              <template v-else-if="d.spotify">Только треки Spotify</template>
              <template v-else>Ничего не играет</template>
            </span>
          </span>
        </button>
        <p v-if="list.length <= 1" class="picker__hint">
          Откройте сайт на телефоне или другом компьютере — устройство появится здесь, и на него можно будет перенести музыку.
        </p>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.picker {
  position: relative;

  &__btn {
    position: relative;
  }

  &__dot {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--c-accent);
  }

  &__panel {
    @include glass(true);

    position: fixed;
    z-index: 60;
    display: grid;
    gap: 2px;
    width: 320px;
    padding: var(--space-2);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);

    @include down(md) {
      right: var(--space-3) !important;
      left: var(--space-3);
      width: auto;
    }
  }

  &__title {
    padding: var(--space-2) var(--space-3);
    font-weight: 700;
  }

  &__hint {
    padding: var(--space-2) var(--space-3) var(--space-3);
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }
}

.device {
  @include reset-button;
  @include focus-ring;

  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  text-align: left;

  @include hover {
    background: var(--c-surface);
  }

  &__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--c-surface);
    color: var(--c-text-muted);

    svg {
      width: 18px;
      height: 18px;
    }
  }

  &.is-active &__icon {
    background: var(--c-accent);
    color: var(--c-on-accent);
  }

  &.is-active &__name {
    color: var(--c-accent);
  }

  &__text {
    display: grid;
    min-width: 0;
  }

  &__name {
    @include truncate;

    font-weight: 600;
  }

  &__sub {
    @include truncate;

    color: var(--c-text-muted);
    font-size: var(--fs-xs);
  }

  &__badge {
    justify-self: start;
    padding: 0 6px;
    border-radius: var(--radius-full);
    background: #1db95422;
    color: #1db954;
    font-size: 10px;
    font-weight: 700;
    line-height: 16px;
  }
}

.pop-enter-active,
.pop-leave-active {
  transition: opacity var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
