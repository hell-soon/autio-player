<script setup lang="ts">
import YandexDeviceLogin from './YandexDeviceLogin.vue'
import { useMusicServices } from '@/entities/preferences'
import { UiButton, useToast } from '@/shared/ui'

const props = defineProps<{ connected: boolean, name?: string | null, plus?: boolean }>()
const emit = defineEmits<{ changed: [] }>()
const toast = useToast()
const music = useMusicServices()

async function disconnect() {
  try {
    await $fetch('/api/auth/yandex/logout', { method: 'POST' })
    emit('changed')
  }
  catch (e: any) {
    toast.error(e?.data?.message || 'Не удалось отключить')
  }
}

function onConnected() {
  toast.show('Яндекс Музыка подключена')
  emit('changed')
}
void props
</script>

<template>
  <div class="connection">
    <div class="connection__head">
      <div>
        <div class="connection__title">
          Яндекс Музыка
        </div>
        <div class="connection__sub">
          <template v-if="connected">
            {{ name }} · {{ plus ? 'Плюс' : 'без Плюса — только 30-секундные фрагменты' }}
          </template>
          <template v-else>
            Не подключена — нужна для радио, «Моей волны»{{ music.hasSpotify.value ? ' и треков Spotify на телефоне' : ' и всей музыки' }}
          </template>
        </div>
      </div>
      <UiButton v-if="connected" variant="ghost" size="sm" @click="disconnect">
        Отключить
      </UiButton>
    </div>
    <YandexDeviceLogin v-if="!connected" label="Подключить Яндекс" @done="onConnected" />
  </div>
</template>

<style lang="scss" scoped>
.connection {
  display: grid;
  gap: var(--space-3);

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
  }

  &__title {
    font-weight: 600;
  }

  &__sub {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }
}
</style>
