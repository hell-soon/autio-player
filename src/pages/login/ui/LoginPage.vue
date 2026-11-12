<script setup lang="ts">
import { AudioLines } from 'lucide-vue-next'
import { SpotifyLoginButton } from '@/features/auth-by-spotify'
import { YandexDeviceLogin } from '@/features/auth-by-yandex'
import { UiInput } from '@/shared/ui'

const route = useRoute()
const { fetch: refreshSession } = useUserSession()
const { data: config } = useFetch('/api/auth/config')

// Ссылка-приглашение: /login?invite=КОД — код подставляется сам.
const invite = ref(String(route.query.invite ?? ''))
const showInvite = ref(!!invite.value)

async function onYandexDone() {
  await refreshSession()
  await navigateTo('/')
}
</script>

<template>
  <main class="login">
    <div class="login__card">
      <span class="login__mark"><AudioLines /></span>
      <div>
        <h1 class="login__title">
          Audio
        </h1>
        <p class="login__subtitle">
          Музыка из Яндекса и Spotify в одном месте
        </p>
      </div>

      <p v-if="config?.firstUser" class="login__note">
        Вы первый — станете владельцем сайта.
      </p>

      <YandexDeviceLogin :invite="invite" @done="onYandexDone" />
      <SpotifyLoginButton v-if="config?.spotifyEnabled" :invite="invite" />

      <template v-if="config?.inviteRequired">
        <button v-if="!showInvite" type="button" class="login__link" @click="showInvite = true">
          Первый раз здесь? Введите код приглашения
        </button>
        <UiInput v-else v-model="invite" placeholder="Код приглашения" autofocus />
      </template>

      <p v-if="route.query.error" class="login__error" role="alert">
        {{ route.query.error }}
      </p>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.login {
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: var(--space-4);
  background:
    radial-gradient(50% 40% at 30% 10%, var(--c-accent-soft), transparent),
    radial-gradient(40% 40% at 80% 90%, var(--c-accent-soft), transparent),
    var(--c-bg);

  &__card {
    @include glass(true);

    display: grid;
    gap: var(--space-4);
    width: 100%;
    max-width: 380px;
    padding: var(--space-6) var(--space-5);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
  }

  &__mark {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: var(--radius-md);
    background: var(--c-accent);
    color: var(--c-on-accent);

    svg {
      width: 28px;
      height: 28px;
    }
  }

  &__title {
    font-size: var(--fs-2xl);
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  &__subtitle,
  &__note {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__link {
    @include reset-button;

    justify-self: center;
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
    text-decoration: underline;
    text-underline-offset: 3px;

    @include hover {
      color: var(--c-text);
    }
  }

  &__error {
    color: var(--c-danger);
    font-size: var(--fs-sm);
  }
}
</style>
