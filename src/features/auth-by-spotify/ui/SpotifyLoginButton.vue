<script setup lang="ts">
import { UiButton } from '@/shared/ui'

/** Вход через Spotify (или привязка, если пользователь уже вошёл) — обычный OAuth-редирект. */
const props = defineProps<{ invite?: string, label?: string, variant?: 'primary' | 'secondary' }>()
const href = computed(() => {
  const q = props.invite ? `?invite=${encodeURIComponent(props.invite)}` : ''
  return `/api/auth/spotify/login${q}`
})
</script>

<template>
  <UiButton :to="href" external :variant="variant ?? 'secondary'" size="lg" block>
    <template #icon>
      <svg viewBox="0 0 24 24" aria-hidden="true" class="spotify-logo">
        <circle cx="12" cy="12" r="12" fill="#1ed760" />
        <path d="M17.3 16.6a.75.75 0 0 1-1 .25c-2.85-1.74-6.43-2.13-10.65-1.17a.75.75 0 1 1-.33-1.46c4.62-1.05 8.58-.6 11.74 1.33.36.22.47.69.25 1.05Zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.26-2-8.23-2.58-12.09-1.41a.94.94 0 1 1-.55-1.8c4.41-1.34 9.89-.69 13.62 1.6.44.27.58.85.31 1.3Zm.13-3.4C15 7.6 8.55 7.39 4.82 8.52a1.13 1.13 0 1 1-.66-2.16c4.29-1.3 11.42-1.05 15.92 1.62a1.13 1.13 0 0 1-1.18 1.95Z" fill="#000" />
      </svg>
    </template>
    {{ label ?? 'Войти через Spotify' }}
  </UiButton>
</template>

<style lang="scss" scoped>
.spotify-logo {
  width: 22px !important;
  height: 22px !important;
}
</style>
