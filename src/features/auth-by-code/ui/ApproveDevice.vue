<script setup lang="ts">
import { CircleCheck, MonitorSmartphone } from 'lucide-vue-next'
import { UiButton, UiInput } from '@/shared/ui'

/**
 * Подтвердить вход на другом устройстве (это устройство уже вошло): ввести код с экрана нового устройства
 * (или открыть ссылку из QR — код подставится), проверить, что за устройство, и разрешить.
 */
const props = defineProps<{ initialCode?: string }>()

const code = ref((props.initialCode ?? '').replace(/\D/g, '').slice(0, 6))
const info = ref<{ device: string } | null>(null)
const state = ref<'enter' | 'confirm' | 'done'>('enter')
const loading = ref(false)
const error = ref('')

const digits = computed(() => code.value.replace(/\D/g, ''))

async function check() {
  if (digits.value.length !== 6) return
  loading.value = true
  error.value = ''
  try {
    info.value = await $fetch('/api/auth/link/info', { query: { code: digits.value } })
    state.value = 'confirm'
  }
  catch (e: any) {
    error.value = e?.data?.message || 'Код не найден'
  }
  finally {
    loading.value = false
  }
}

async function approve() {
  loading.value = true
  error.value = ''
  try {
    info.value = await $fetch('/api/auth/link/approve', { method: 'POST', body: { code: digits.value } })
    state.value = 'done'
  }
  catch (e: any) {
    error.value = e?.data?.message || 'Не удалось подтвердить'
    state.value = 'enter'
  }
  finally {
    loading.value = false
  }
}

function reset() {
  code.value = ''
  info.value = null
  error.value = ''
  state.value = 'enter'
}

// Код из QR — сразу к подтверждению; 6 цифр набраны — тоже
onMounted(() => {
  if (digits.value.length === 6) check()
})
watch(digits, (d) => {
  if (d.length === 6 && state.value === 'enter') check()
})
</script>

<template>
  <div class="approve">
    <Transition name="approve" mode="out-in">
      <form v-if="state === 'enter'" key="enter" class="approve__step" @submit.prevent="check">
        <p class="approve__hint">
          На новом устройстве нажмите «Войти с другого устройства» — там появится код из 6 цифр.
        </p>
        <UiInput
          v-model="code"
          placeholder="000 000"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="7"
          autofocus
          class="approve__input"
          aria-label="Код с нового устройства"
        />
        <p v-if="error" class="approve__error" role="alert">
          {{ error }}
        </p>
        <UiButton type="submit" variant="primary" size="lg" block :loading="loading" :disabled="digits.length !== 6">
          Продолжить
        </UiButton>
      </form>

      <div v-else-if="state === 'confirm'" key="confirm" class="approve__step">
        <div class="approve__device">
          <MonitorSmartphone />
          <div>
            <strong>{{ info?.device }}</strong>
            <span>просит войти в ваш аккаунт</span>
          </div>
        </div>
        <p class="approve__hint">
          Разрешайте, только если это ваше устройство и код вы видите на его экране прямо сейчас.
        </p>
        <UiButton variant="primary" size="lg" block :loading="loading" @click="approve">
          Разрешить вход
        </UiButton>
        <UiButton variant="ghost" block @click="reset">
          Это не я
        </UiButton>
      </div>

      <div v-else key="done" class="approve__step approve__done">
        <CircleCheck class="approve__ok" />
        <strong>Готово</strong>
        <span>{{ info?.device }} вошло в ваш аккаунт.</span>
        <UiButton variant="ghost" @click="reset">
          Ещё одно устройство
        </UiButton>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.approve {
  &__step {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-3);
  }

  &__hint {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
    line-height: 1.45;
  }

  // Крупные цифры кода
  &__input :deep(input) {
    font-size: 1.5rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.2em;
    text-align: center;
  }

  &__input {
    height: 56px;
  }

  &__error {
    color: var(--c-danger);
    font-size: var(--fs-sm);
  }

  &__device {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--c-accent-soft);

    svg {
      flex: none;
      width: 28px;
      height: 28px;
      color: var(--c-accent);
    }

    div {
      display: grid;
      gap: 2px;
    }

    span {
      color: var(--c-text-muted);
      font-size: var(--fs-sm);
    }
  }

  &__done {
    justify-items: center;
    padding: var(--space-4) 0;
    text-align: center;

    span {
      color: var(--c-text-muted);
    }
  }

  &__ok {
    width: 48px;
    height: 48px;
    color: var(--c-accent);
    animation: like-pop-ok 0.5s cubic-bezier(0.3, 1.5, 0.5, 1);
  }
}

.approve-enter-active,
.approve-leave-active {
  transition: opacity 0.2s var(--ease), transform 0.2s var(--ease);
}

.approve-enter-from {
  opacity: 0;
  transform: translateX(12px);
}

.approve-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

@keyframes like-pop-ok {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
}
</style>
