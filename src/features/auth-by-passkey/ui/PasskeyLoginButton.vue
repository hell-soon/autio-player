<script setup lang="ts">
import { ScanFace } from 'lucide-vue-next'
import { UiButton } from '@/shared/ui'

/**
 * Вход по Face ID / Touch ID (passkey): устройство само предложит ключ этого сайта.
 * Ключ включается в настройках после первого входа и синхронизируется (iCloud Keychain / Google).
 */
const emit = defineEmits<{ done: [] }>()
const { isSupported, authenticate } = useWebAuthn()
const { fetch: refreshSession } = useUserSession()
const loading = ref(false)
const error = ref('')
// Кнопка видна и до проверки (браузеры без WebAuthn — редкость), иначе она «выпрыгивала» бы после загрузки
const checked = ref(false)
onMounted(() => nextTick(() => (checked.value = true)))

async function signIn() {
  error.value = ''
  loading.value = true
  try {
    if (await authenticate()) {
      await refreshSession()
      emit('done')
    }
  }
  catch (e: any) {
    // Отмена — молча; ошибка сервера — понятным текстом
    if (e?.name !== 'NotAllowedError' && e?.name !== 'AbortError') {
      error.value = e?.data?.message || 'Не получилось войти по ключу. Включите вход по Face ID в настройках после входа другим способом.'
    }
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <template v-if="!checked || isSupported">
    <UiButton size="lg" block :loading="loading" @click="signIn">
      <template #icon>
        <ScanFace />
      </template>
      Войти по Face ID / Touch ID
    </UiButton>
    <p v-if="error" class="passkey-error" role="alert">
      {{ error }}
    </p>
  </template>
</template>

<style lang="scss" scoped>
.passkey-error {
  color: var(--c-danger);
  font-size: var(--fs-sm);
}
</style>
