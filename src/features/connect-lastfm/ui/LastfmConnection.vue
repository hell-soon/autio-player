<script setup lang="ts">
import { useCachedFetch } from '@/shared/lib'
import { UiButton, useToast } from '@/shared/ui'

/** Подключение Last.fm для скробблинга. */
const toast = useToast()
const { data, refresh } = useCachedFetch<{ enabled: boolean, connected: boolean, name: string | null }>('/api/lastfm/status', { key: 'lastfm:status' })

async function disconnect() {
  await $fetch('/api/auth/lastfm/logout', { method: 'POST' })
  await refresh()
  toast.show('Last.fm отключён')
}
</script>

<template>
  <div v-if="data?.enabled" class="connection">
    <div>
      <div class="connection__title">
        Last.fm
      </div>
      <div class="connection__sub">
        <template v-if="data.connected">
          {{ data.name }} · прослушивания отправляются в профиль
        </template>
        <template v-else>
          Скробблинг: всё, что вы слушаете, будет попадать в ваш профиль Last.fm
        </template>
      </div>
    </div>
    <UiButton v-if="data.connected" variant="ghost" size="sm" @click="disconnect">
      Отключить
    </UiButton>
    <UiButton v-else to="/api/auth/lastfm/login" external size="sm" variant="primary">
      Подключить
    </UiButton>
  </div>
</template>

<style lang="scss" scoped>
.connection {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);

  &__title {
    font-weight: 600;
  }

  &__sub {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }
}
</style>
