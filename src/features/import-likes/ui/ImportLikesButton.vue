<script setup lang="ts">
import { Download } from 'lucide-vue-next'
import { refreshPlaylists, useLikes } from '@/entities/library'
import { plural } from '@/shared/lib'
import { UiButton, useToast } from '@/shared/ui'

/** Забрать лайки из Spotify и Яндекса в библиотеку сайта. */
const loading = ref(false)
const toast = useToast()
const likes = useLikes()

async function run() {
  loading.value = true
  try {
    const r = await $fetch<{ spotify: number, yandex: number, errors: string[] }>('/api/library/import', { method: 'POST' })
    const n = r.spotify + r.yandex
    toast.show(n ? `Добавлено ${n} ${plural(n, ['трек', 'трека', 'треков'])} в любимые` : 'Новых лайков нет')
    if (r.errors.length) toast.error(`Не удалось загрузить: ${r.errors.join(', ')}`)
    await likes.load(true)
    refreshNuxtData('library:liked')
    refreshPlaylists()
  }
  catch {
    toast.error('Не удалось импортировать')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UiButton :loading="loading" @click="run">
    <template #icon>
      <Download />
    </template>
    Импорт лайков
  </UiButton>
</template>
