<script setup lang="ts">
import { useCachedFetch } from '@/shared/lib'
import { LogOut } from 'lucide-vue-next'
import { SpotifyConnection } from '@/features/auth-by-spotify'
import { YandexConnection } from '@/features/auth-by-yandex'
import { LastfmConnection } from '@/features/connect-lastfm'
import { ThemeSettings } from '@/features/switch-theme'
import { usePlayer } from '@/entities/player'
import { SOURCE_PREFERENCES, useSourcePreference } from '@/entities/preferences'
import { UiButton, UiCover, UiPageHeader, UiSegmented, UiSwitch, useToast } from '@/shared/ui'

const route = useRoute()
const toast = useToast()
const { data: invite } = useCachedFetch<{ owner: boolean, code?: string | null }>('/api/me/invite', { key: 'me:invite', ttl: 30 * 60_000 })
const inviteLink = computed(() => (invite.value?.code && import.meta.client ? `${location.origin}/login?invite=${encodeURIComponent(invite.value.code)}` : ''))
async function copyInvite() {
  await navigator.clipboard?.writeText(inviteLink.value).catch(() => {})
  toast.show('Ссылка скопирована')
}
const { user, clear } = useUserSession()
const { data: connections, refresh } = useCachedFetch<{ spotify: { displayName: string | null, premium: boolean } | null, yandex: { displayName: string | null, premium: boolean } | null }>('/api/me/connections', { key: 'me:connections' })
const player = usePlayer()
const sourcePref = useSourcePreference()
const autoplay = computed({ get: () => player.autoplay.value, set: v => player.setAutoplay(v) })
const crossfade = computed({ get: () => String(player.crossfade.value), set: v => player.setCrossfade(Number(v)) })
const CROSSFADE = [
  { value: '0', label: 'Выкл' },
  { value: '3000', label: '3 с' },
  { value: '6000', label: '6 с' },
  { value: '10000', label: '10 с' },
]

async function onChanged() {
  await refresh()
  refreshNuxtData('spotify-account')
}

async function logout() {
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="settings">
    <UiPageHeader title="Настройки" />

    <section class="settings__section settings__profile">
      <UiCover :src="user?.avatarUrl" :size="56" rounded="full" />
      <div class="settings__profile-name">
        {{ user?.name }}
      </div>
      <UiButton variant="danger" size="sm" @click="logout">
        <template #icon>
          <LogOut />
        </template>
        Выйти
      </UiButton>
    </section>

    <section v-if="invite?.owner" class="settings__section">
      <h2 class="settings__heading">
        Пригласить друга
      </h2>
      <template v-if="invite.code">
        <p class="settings__hint">
          Отправьте ссылку — код приглашения подставится сам. Друг войдёт через свой Яндекс или Spotify, и у него будет своя библиотека.
        </p>
        <div class="settings__invite">
          <code>{{ inviteLink }}</code>
          <UiButton size="sm" variant="primary" @click="copyInvite">
            Скопировать
          </UiButton>
        </div>
      </template>
      <p v-else class="settings__hint">
        Регистрация закрыта. Чтобы пригласить друзей, задайте код в переменной окружения <code>NUXT_INVITE_CODE</code> (в <code>.env</code> или в настройках Vercel) и перезапустите сайт.
      </p>
    </section>

    <section class="settings__section">
      <h2 class="settings__heading">
        Сервисы
      </h2>
      <p v-if="route.query.error" class="settings__error" role="alert">
        {{ route.query.error }}
      </p>
      <YandexConnection
        :connected="!!connections?.yandex"
        :name="connections?.yandex?.displayName"
        :plus="connections?.yandex?.premium"
        @changed="onChanged"
      />
      <hr class="settings__divider">
      <SpotifyConnection />
      <LastfmConnection />
    </section>

    <section class="settings__section">
      <h2 class="settings__heading">
        Воспроизведение
      </h2>
      <UiSwitch
        v-model="autoplay"
        label="Продолжать похожей музыкой"
        description="Когда очередь закончится, плеер подберёт похожие треки (радио Яндекса)"
      />
      <div class="settings__row">
        <div>
          <div>Кроссфейд</div>
          <div class="settings__hint">
            Плавный переход между треками Яндекса. Следующий трек всегда грузится заранее — без пауз.
          </div>
        </div>
        <UiSegmented v-model="crossfade" :options="CROSSFADE" label="Кроссфейд" />
      </div>
      <div class="settings__row">
        <div>
          <div>Предпочитать сервис</div>
          <div class="settings__hint">
            Если трек есть и в Яндексе, и в Spotify — в поиске останется версия отсюда. «Авто» — Яндекс: играет на любом устройстве.
          </div>
        </div>
        <UiSegmented v-model="sourcePref" :options="SOURCE_PREFERENCES" label="Предпочитаемый сервис" />
      </div>
    </section>

    <section class="settings__section">
      <h2 class="settings__heading">
        Оформление
      </h2>
      <ThemeSettings />
    </section>
  </div>
</template>

<style lang="scss" scoped>
.settings {
  display: grid;
  gap: var(--space-4);
  max-width: 720px;

  &__section {
    @include glass;

    display: grid;
    gap: var(--space-4);
    padding: var(--space-5);
    border-radius: var(--radius-lg);
  }

  &__profile {
    display: flex;
    align-items: center;
  }

  &__profile-name {
    flex: 1;
    font-size: var(--fs-lg);
    font-weight: 700;
  }

  &__heading {
    font-size: var(--fs-lg);
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  &__hint {
    max-width: 420px;
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__invite {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;

    code {
      flex: 1;
      min-width: 0;
      padding: var(--space-2) var(--space-3);
      overflow: hidden;
      border-radius: var(--radius-sm);
      background: var(--c-surface);
      font-size: var(--fs-sm);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__divider {
    border: 0;
    border-top: 1px solid var(--c-border);
  }

  &__error {
    color: var(--c-danger);
    font-size: var(--fs-sm);
  }
}
</style>
