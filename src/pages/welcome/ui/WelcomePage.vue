<script setup lang="ts">
import { AudioLines, Check, Laptop, Smartphone } from 'lucide-vue-next'
import { SpotifyLoginButton } from '@/features/auth-by-spotify'
import { YandexDeviceLogin } from '@/features/auth-by-yandex'
import { MUSIC_SERVICES, useMusicServices } from '@/entities/preferences'
import { useCachedFetch } from '@/shared/lib'
import { UiButton, useToast } from '@/shared/ui'

/**
 * Приветствие после первого входа: «Чем вы пользуетесь?» → подключить нужный сервис → готово.
 * От выбора зависит интерфейс (лишнего сервиса не видно) и чем играет музыка.
 */
const music = useMusicServices()
const toast = useToast()
const { fetch: refreshSession } = useUserSession()
const { data: connections, refresh } = useCachedFetch<{ yandex: unknown | null, spotify: unknown | null }>('/api/me/connections', { key: 'me:connections' })

const choice = ref<MusicServices>(music.services.value)
const step = ref<'choose' | 'connect'>('choose')
const saving = ref(false)

const ABOUT: Record<MusicServices, { title: string, text: string, notes: { icon: typeof Laptop, text: string }[] }> = {
  yandex: {
    title: 'Яндекс Музыка',
    text: 'Вся музыка, «Моя волна», радио и подборки дня.',
    notes: [{ icon: Smartphone, text: 'Играет на телефоне и компьютере' }],
  },
  spotify: {
    title: 'Spotify',
    text: 'Ваша библиотека и плейлисты Spotify.',
    notes: [{ icon: Laptop, text: 'Играет только на компьютере, нужен Premium' }],
  },
  both: {
    title: 'Оба',
    text: 'Общая библиотека и поиск сразу по двум сервисам.',
    notes: [{ icon: Smartphone, text: 'На телефоне треки Spotify играют через Яндекс' }],
  },
}

const needYandex = computed(() => choice.value !== 'spotify' && !connections.value?.yandex)
const needSpotify = computed(() => choice.value !== 'yandex' && !connections.value?.spotify)

async function next() {
  saving.value = true
  try {
    // Сохраняем выбор сразу: вход в Spotify уходит со страницы и вернёт сюда же
    await music.setServices(choice.value)
    if (needYandex.value || needSpotify.value) step.value = 'connect'
    else await finish()
  }
  catch {
    toast.error('Не удалось сохранить')
  }
  finally {
    saving.value = false
  }
}

async function finish() {
  saving.value = true
  try {
    await music.setServices(choice.value, { onboarded: true })
    await navigateTo('/')
  }
  catch {
    toast.error('Не удалось сохранить')
  }
  finally {
    saving.value = false
  }
}

async function onYandexDone() {
  await refreshSession()
  await refresh()
}

</script>

<template>
  <main class="welcome">
    <div class="welcome__card">
      <span class="welcome__mark"><AudioLines /></span>

      <template v-if="step === 'choose'">
        <div>
          <h1 class="welcome__title">
            Чем вы пользуетесь?
          </h1>
          <p class="welcome__lead">
            Сайт подстроится: лишнего не будет. Поменять можно в настройках.
          </p>
        </div>

        <div class="welcome__options" role="radiogroup" aria-label="Музыкальные сервисы">
          <button
            v-for="o in MUSIC_SERVICES"
            :key="o.value"
            type="button"
            role="radio"
            class="option"
            :class="{ 'is-on': choice === o.value }"
            :aria-checked="choice === o.value"
            @click="choice = o.value"
          >
            <span class="option__text">
              <span class="option__title">{{ ABOUT[o.value].title }}</span>
              <span class="option__desc">{{ ABOUT[o.value].text }}</span>
              <span v-for="n in ABOUT[o.value].notes" :key="n.text" class="option__note"><component :is="n.icon" /> {{ n.text }}</span>
            </span>
            <span class="option__check"><Check /></span>
          </button>
        </div>

        <UiButton variant="primary" size="lg" block :loading="saving" @click="next">
          Дальше
        </UiButton>
      </template>

      <template v-else>
        <div>
          <h1 class="welcome__title">
            Подключите {{ needYandex && needSpotify ? 'сервисы' : needYandex ? 'Яндекс Музыку' : 'Spotify' }}
          </h1>
          <p class="welcome__lead">
            Чтобы играла ваша музыка, библиотека и лайки.
          </p>
        </div>

        <section v-if="needYandex" class="welcome__connect">
          <h2>Яндекс Музыка</h2>
          <YandexDeviceLogin @done="onYandexDone" />
        </section>
        <section v-if="needSpotify" class="welcome__connect">
          <h2>Spotify</h2>
          <SpotifyLoginButton />
        </section>

        <UiButton :variant="needYandex || needSpotify ? 'ghost' : 'primary'" size="lg" block :loading="saving" @click="finish">
          {{ needYandex || needSpotify ? 'Подключу позже' : 'Готово' }}
        </UiButton>
      </template>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.welcome {
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: var(--space-5) var(--space-4) calc(var(--space-5) + env(safe-area-inset-bottom));
  padding-top: calc(var(--space-5) + env(safe-area-inset-top));

  &__card {
    @include glass(true);

    display: grid;
    gap: var(--space-5);
    width: min(100%, 460px);
    padding: var(--space-6);
    border-radius: var(--radius-xl);

    @include down(sm) {
      padding: var(--space-5);
    }
  }

  &__mark {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    background: var(--c-accent);
    color: var(--c-on-accent);
  }

  &__title {
    font-size: var(--fs-2xl);
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.15;
  }

  &__lead {
    margin-top: var(--space-2);
    color: var(--c-text-muted);
  }

  &__options {
    display: grid;
    gap: var(--space-2);
  }

  &__connect {
    display: grid;
    gap: var(--space-3);

    h2 {
      font-size: var(--fs-lg);
    }
  }
}

.option {
  @include reset-button;
  @include focus-ring;

  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--c-glass-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  text-align: left;
  transition: background-color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);

  @include hover {
    background: var(--c-surface-hover);
  }

  &.is-on {
    border-color: var(--c-accent);
    background: var(--c-accent-soft);
  }

  &__text {
    display: grid;
    flex: 1;
    gap: 2px;
    min-width: 0;
  }

  &__title {
    font-weight: 700;
  }

  &__desc {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__note {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
    color: var(--c-text-subtle);
    font-size: var(--fs-xs);

    svg {
      width: 14px;
      height: 14px;
      flex: none;
    }
  }

  &__check {
    display: grid;
    flex: none;
    place-items: center;
    width: 24px;
    height: 24px;
    border: 2px solid var(--c-glass-border);
    border-radius: 50%;
    color: transparent;

    svg {
      width: 14px;
      height: 14px;
    }
  }

  &.is-on &__check {
    border-color: var(--c-accent);
    background: var(--c-accent);
    color: var(--c-on-accent);
  }
}
</style>
