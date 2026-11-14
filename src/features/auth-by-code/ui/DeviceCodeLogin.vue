<script setup lang="ts">
import { MonitorSmartphone, RefreshCw } from 'lucide-vue-next'
import { renderSVG } from 'uqr'
import { UiButton, UiSpinner } from '@/shared/ui'

/**
 * Вход с другого устройства (новое устройство): показываем код и QR, ждём подтверждения на устройстве,
 * где уже вошли. Код живёт 3 минуты — по истечении обновляется сам. Сервер: server/utils/login-link.ts.
 */
const emit = defineEmits<{ done: [] }>()

const open = ref(false)
const link = ref<{ code: string, token: string, expiresAt: number } | null>(null)
const error = ref('')
const now = ref(Date.now())
let pollTimer: ReturnType<typeof setTimeout> | undefined
let clock: ReturnType<typeof setInterval> | undefined

const codeLabel = computed(() => (link.value ? `${link.value.code.slice(0, 3)} ${link.value.code.slice(3)}` : ''))
const approveUrl = computed(() => (link.value && import.meta.client ? `${location.origin}/link?code=${link.value.code}` : ''))
// QR — цвета берутся из темы через currentColor не получится (SVG как строка), поэтому чёрный на белом: так его читают все камеры
const qr = computed(() => (approveUrl.value ? renderSVG(approveUrl.value, { border: 2, ecc: 'M' }) : ''))
const left = computed(() => {
  if (!link.value) return ''
  const s = Math.max(0, Math.round((link.value.expiresAt - now.value) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})

async function start() {
  open.value = true
  error.value = ''
  clearTimeout(pollTimer)
  try {
    link.value = await $fetch('/api/auth/link/start', { method: 'POST' })
    poll()
  }
  catch {
    error.value = 'Не удалось получить код — попробуйте ещё раз'
  }
}

async function poll() {
  const l = link.value
  if (!l || !open.value) return
  try {
    const r = await $fetch<{ status: 'pending' | 'approved' | 'expired' }>('/api/auth/link/poll', { method: 'POST', body: { token: l.token } })
    if (r.status === 'approved') return emit('done')
    if (r.status === 'expired' || Date.now() > l.expiresAt) return start() // новый код сам
  }
  catch {}
  pollTimer = setTimeout(poll, 2000)
}

function close() {
  open.value = false
  clearTimeout(pollTimer)
}

onMounted(() => (clock = setInterval(() => (now.value = Date.now()), 1000)))
onBeforeUnmount(() => {
  clearTimeout(pollTimer)
  clearInterval(clock)
})
</script>

<template>
  <UiButton v-if="!open" size="lg" block @click="start">
    <template #icon>
      <MonitorSmartphone />
    </template>
    Войти с другого устройства
  </UiButton>

  <div v-else class="code-login">
    <p class="code-login__hint">
      На телефоне или компьютере, где вы уже вошли, откройте <b>Настройки → «Войти на другом устройстве»</b> и введите код — или наведите камеру на QR.
    </p>

    <div v-if="link" class="code-login__body">
      <!-- eslint-disable-next-line vue/no-v-html -- SVG сгенерирован локально из нашей ссылки -->
      <div class="code-login__qr" role="img" aria-label="QR-код для входа" v-html="qr" />
      <div class="code-login__side">
        <span class="code-login__code" aria-label="Код входа">{{ codeLabel }}</span>
        <span class="code-login__wait">
          <UiSpinner /> Ждём подтверждения · {{ left }}
        </span>
      </div>
    </div>
    <div v-else-if="!error" class="code-login__loading">
      <UiSpinner />
    </div>
    <p v-if="error" class="code-login__error" role="alert">
      {{ error }}
    </p>

    <div class="code-login__actions">
      <UiButton size="sm" variant="ghost" @click="start">
        <template #icon>
          <RefreshCw />
        </template>
        Новый код
      </UiButton>
      <UiButton size="sm" variant="ghost" @click="close">
        Отмена
      </UiButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.code-login {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  animation: rise-in 0.3s var(--ease) both;

  &__hint {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
    line-height: 1.45;

    b {
      color: var(--c-text);
      font-weight: 600;
    }
  }

  &__body {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  // QR всегда чёрный на белом (так его уверенно читает любая камера), в белой рамке
  &__qr {
    flex: none;
    width: 120px;
    height: 120px;
    padding: 6px;
    border-radius: var(--radius-md);
    background: #fff;

    :deep(svg) {
      display: block;
      width: 100%;
      height: 100%;
    }
  }

  &__side {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  &__code {
    font-size: clamp(1.5rem, 8vw, 2rem);
    white-space: nowrap;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.08em;
  }

  &__wait {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__loading {
    display: grid;
    place-items: center;
    height: 132px;
  }

  &__error {
    color: var(--c-danger);
    font-size: var(--fs-sm);
  }

  &__actions {
    display: flex;
    justify-content: space-between;
  }
}
</style>
