<script setup lang="ts">
import { Moon, TimerOff } from 'lucide-vue-next'
import { usePlayer } from '@/entities/player'
import { UiIconButton, UiMenu, useToast, type UiMenuItem } from '@/shared/ui'

/** Таймер сна: пауза через N минут или в конце текущего трека. */
const p = usePlayer()
const toast = useToast()

const now = ref(Date.now())
let t: ReturnType<typeof setInterval> | undefined
onMounted(() => (t = setInterval(() => (now.value = Date.now()), 15_000)))
onBeforeUnmount(() => clearInterval(t))

const label = computed(() => {
  const at = p.sleepAt.value
  if (at === 'track') return 'Таймер сна: до конца трека'
  if (typeof at === 'number') return `Таймер сна: ещё ${Math.max(1, Math.round((at - now.value) / 60_000))} мин`
  return 'Таймер сна'
})

function set(v: number | 'track' | null, msg: string) {
  p.setSleepTimer(v)
  toast.show(msg)
}

const items = computed<UiMenuItem[]>(() => [
  ...[15, 30, 45, 60].map(m => ({ label: `Через ${m} минут`, icon: Moon, action: () => set(m, `Пауза через ${m} минут`) })),
  { label: 'В конце трека', icon: Moon, action: () => set('track', 'Пауза в конце трека') },
  ...(p.sleepAt.value !== null ? [{ label: 'Выключить таймер', icon: TimerOff, danger: true, action: () => set(null, 'Таймер выключен') }] : []),
])
</script>

<template>
  <UiMenu :items="items" label="Таймер сна">
    <UiIconButton :label="label" :active="p.sleepAt.value !== null">
      <Moon />
    </UiIconButton>
  </UiMenu>
</template>
