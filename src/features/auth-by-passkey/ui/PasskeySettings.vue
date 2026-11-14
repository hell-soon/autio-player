<script setup lang="ts">
import { KeyRound, ScanFace, Trash2 } from 'lucide-vue-next'
import { useCachedFetch } from '@/shared/lib'
import { UiButton, UiIconButton, UiSkeleton, useToast } from '@/shared/ui'

/** Настройки: включить вход по Face ID / Touch ID (создать passkey) и список ключей с удалением. */
interface Passkey { id: string, name: string, createdAt: number, lastUsedAt: number | null, synced: boolean }

const { isSupported, register } = useWebAuthn()
const { user } = useUserSession()
const toast = useToast()
// Список приходит вместе со страницей (SSR) — ничего не «допрыгивает» после загрузки
const { data: keys, status, refresh } = useCachedFetch<Passkey[]>('/api/me/passkeys', { key: 'me:passkeys', default: () => [] })
const adding = ref(false)
// Поддержку WebAuthn знаем только в браузере: до этого кнопка видна (как в большинстве браузеров), без мигания
const ready = ref(false)
onMounted(() => (ready.value = true))

const date = (ms: number) => new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

async function add() {
  adding.value = true
  try {
    const name = user.value?.name || 'Слушатель'
    if (await register({ userName: name, displayName: name })) {
      toast.show('Вход по Face ID включён')
      await refresh()
    }
  }
  catch (e: any) {
    if (e?.name === 'InvalidStateError') toast.show('На этом устройстве ключ уже есть')
    else if (e?.name !== 'NotAllowedError' && e?.name !== 'AbortError') toast.error(e?.data?.message || 'Не удалось создать ключ')
  }
  finally {
    adding.value = false
  }
}

async function remove(k: Passkey) {
  if (!confirm(`Удалить ключ «${k.name}»? Войти по нему больше не получится.`)) return
  try {
    await $fetch(`/api/me/passkeys/${encodeURIComponent(k.id)}`, { method: 'DELETE' })
    await refresh()
    toast.show('Ключ удалён')
  }
  catch {
    toast.error('Не удалось удалить')
  }
}
</script>

<template>
  <div class="passkeys">
    <div class="passkeys__row">
      <div>
        <div>Вход по Face ID / Touch ID</div>
        <div class="passkeys__hint">
          Вход без кодов одним касанием. Ключ сохраняется в связке ключей (iCloud / Google) и работает на всех ваших устройствах.
        </div>
      </div>
      <UiButton v-if="!ready || isSupported" :loading="adding" variant="primary" @click="add">
        <template #icon>
          <ScanFace />
        </template>
        {{ keys.length ? 'Добавить' : 'Включить' }}
      </UiButton>
    </div>

    <!-- Высота резервируется под список: ничего не прыгает, когда он загрузился -->
    <UiSkeleton v-if="status === 'pending' && !keys.length" height="52px" radius="var(--radius-md)" />
    <ul v-else-if="keys.length" class="passkeys__list">
      <li v-for="k in keys" :key="k.id" class="passkeys__item">
        <KeyRound class="passkeys__icon" />
        <div class="passkeys__text">
          <span>{{ k.name }}</span>
          <span class="passkeys__hint">
            Создан {{ date(k.createdAt) }}<template v-if="k.lastUsedAt"> · вход {{ date(k.lastUsedAt) }}</template><template v-if="k.synced"> · синхронизируется</template>
          </span>
        </div>
        <UiIconButton label="Удалить ключ" size="sm" @click="remove(k)">
          <Trash2 />
        </UiIconButton>
      </li>
    </ul>
    <p v-if="ready && !isSupported" class="passkeys__hint">
      Этот браузер не поддерживает ключи входа.
    </p>
  </div>
</template>

<style lang="scss" scoped>
.passkeys {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);

    @include down(sm) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  &__hint {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__list {
    display: grid;
    gap: 2px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    background: var(--c-surface);
  }

  &__icon {
    flex: none;
    width: 20px;
    height: 20px;
    color: var(--c-accent);
  }

  &__text {
    display: grid;
    flex: 1;
    min-width: 0;

    span:first-child {
      font-weight: 600;
    }
  }
}
</style>
