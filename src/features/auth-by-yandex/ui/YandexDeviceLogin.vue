<script setup lang="ts">
import { Copy, ExternalLink } from 'lucide-vue-next'
import { UiButton, UiSpinner } from '@/shared/ui'

/**
 * Вход/подключение Яндекса «по коду»: показываем код, пользователь открывает ya.ru/device
 * (можно с телефона) и вводит его. Сайт опрашивает сервер, пока вход не подтвердят.
 */
const props = defineProps<{ invite?: string, label?: string }>()
const emit = defineEmits<{ done: [] }>()

const step = ref<'idle' | 'code' | 'done'>('idle')
const code = ref<{ userCode: string, verificationUrl: string, interval: number, expiresIn: number } | null>(null)
const error = ref('')
const loading = ref(false)
const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let deadline = 0

async function start() {
  error.value = ''
  loading.value = true
  try {
    const res = await $fetch('/api/auth/yandex/device', { method: 'POST', body: { invite: props.invite } })
    code.value = res
    step.value = 'code'
    deadline = Date.now() + res.expiresIn * 1000
    schedule()
  }
  catch (e: any) {
    error.value = e?.data?.message || 'Не удалось начать вход'
  }
  finally {
    loading.value = false
  }
}

function schedule() {
  clearTimeout(timer)
  timer = setTimeout(poll, Math.max(2, code.value?.interval ?? 5) * 1000)
}

async function poll() {
  if (Date.now() > deadline) {
    error.value = 'Код устарел — получите новый'
    step.value = 'idle'
    return
  }
  try {
    const res = await $fetch<{ status: 'pending' | 'ok' }>('/api/auth/yandex/poll', { method: 'POST' })
    if (res.status === 'ok') {
      step.value = 'done'
      emit('done')
      return
    }
    schedule()
  }
  catch (e: any) {
    error.value = e?.data?.message || 'Ошибка входа'
    step.value = 'idle'
  }
}

async function copy() {
  if (!code.value) return
  await navigator.clipboard?.writeText(code.value.userCode).catch(() => {})
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="ya-login">
    <UiButton v-if="step === 'idle'" variant="primary" size="lg" block :loading="loading" class="ya-login__start" @click="start">
      <template #icon>
        <span class="ya-login__logo">Я</span>
      </template>
      {{ label ?? 'Войти через Яндекс' }}
    </UiButton>

    <div v-else-if="step === 'code' && code" class="ya-login__code-box">
      <p class="ya-login__hint">
        Откройте страницу Яндекса и введите код. Можно с телефона, где вы уже вошли в Яндекс.
      </p>
      <button type="button" class="ya-login__code" :title="copied ? 'Скопировано' : 'Скопировать'" @click="copy">
        {{ code.userCode }}
        <Copy />
      </button>
      <UiButton :to="code.verificationUrl" external target="_blank" variant="primary" block>
        <template #icon>
          <ExternalLink />
        </template>
        Открыть {{ code.verificationUrl.replace('https://', '') }}
      </UiButton>
      <p class="ya-login__wait">
        <UiSpinner /> Ждём подтверждения…
      </p>
    </div>

    <p v-else-if="step === 'done'" class="ya-login__wait">
      <UiSpinner /> Входим…
    </p>

    <p v-if="error" class="ya-login__error" role="alert">
      {{ error }}
    </p>
  </div>
</template>

<style lang="scss" scoped>
.ya-login {
  display: grid;
  gap: var(--space-3);

  &__logo {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fc3f1d;
    color: #fff;
    font-size: 13px;
    font-weight: 800;
  }

  &__code-box {
    display: grid;
    gap: var(--space-3);
    justify-items: stretch;
    text-align: center;
  }

  &__hint {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__code {
    @include reset-button;
    @include focus-ring;

    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-3);
    border-radius: var(--radius-md);
    background: var(--c-surface);
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 0.12em;

    svg {
      width: 18px;
      height: 18px;
      color: var(--c-text-subtle);
    }
  }

  &__wait {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__error {
    color: var(--c-danger);
    font-size: var(--fs-sm);
  }
}
</style>
