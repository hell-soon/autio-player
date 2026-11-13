<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import { refreshPlaylists, useLikes } from '@/entities/library'
import { plural } from '@/shared/lib'
import { UiButton, useToast } from '@/shared/ui'

/** Сверить лайки сайта с Яндексом и Spotify прямо сейчас (обычно это происходит само в фоне). */
const loading = ref(false)
const toast = useToast()
const likes = useLikes()

async function run() {
  loading.value = true
  try {
    const r = await $fetch<LikesSyncResult>('/api/library/import', { method: 'POST' })
    const parts = [
      r.added && `+${r.added} ${plural(r.added, ['трек', 'трека', 'треков'])}`,
      r.removed && `−${r.removed} снято в сервисе`,
      r.pushed && `${r.pushed} отправлено в сервис`,
    ].filter(Boolean)
    toast.show(parts.length ? `Любимые обновлены: ${parts.join(', ')}` : 'Всё уже совпадает')
    if (r.errors.length) toast.error(`Не удалось сверить: ${r.errors.join(', ')}`)
    await likes.load(true)
    refreshNuxtData('library:liked')
    refreshPlaylists()
  }
  catch {
    toast.error('Не удалось синхронизировать')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UiButton :loading="loading" @click="run">
    <template #icon>
      <RefreshCw :class="{ spin: loading }" />
    </template>
    Синхронизировать лайки
  </UiButton>
</template>
