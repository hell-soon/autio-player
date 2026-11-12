<script setup lang="ts">
import SpotifyLoginButton from './SpotifyLoginButton.vue'
import { usePlayer } from '@/entities/player'
import { useSpotifyAccount } from '@/entities/spotify-account'
import { UiButton, useToast } from '@/shared/ui'

const { data: account, refresh } = useSpotifyAccount()
const player = usePlayer()
const toast = useToast()

const statusText = computed(() => {
  switch (player.spotifyStatus.value) {
    case 'ready': return 'Играет прямо на сайте'
    case 'loading': return 'Подключение плеера…'
    case 'idle': return account.value.connected && !account.value.premium ? 'Без Premium треки Spotify играют через Яндекс' : ''
    default: return player.spotifyError.value
  }
})

async function disconnect() {
  try {
    await $fetch('/api/auth/spotify/logout', { method: 'POST' })
    await refresh()
    refreshNuxtData('me:connections')
  }
  catch (e: any) {
    toast.error(e?.data?.message || 'Не удалось отключить')
  }
}
</script>

<template>
  <div class="connection">
    <div class="connection__head">
      <div>
        <div class="connection__title">
          Spotify
        </div>
        <div class="connection__sub">
          <template v-if="account.connected">
            {{ account.name }} · {{ account.premium ? 'Premium' : 'Free' }}
          </template>
          <template v-else>
            Не подключён
          </template>
        </div>
        <div v-if="account.connected && statusText" class="connection__status">
          {{ statusText }}
        </div>
      </div>
      <UiButton v-if="account.connected" variant="ghost" size="sm" @click="disconnect">
        Отключить
      </UiButton>
    </div>
    <SpotifyLoginButton v-if="!account.connected" label="Подключить Spotify" />
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

  &__sub,
  &__status {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }
}
</style>
