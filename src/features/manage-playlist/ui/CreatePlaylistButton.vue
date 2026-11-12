<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { refreshPlaylists } from '@/entities/library'
import { UiButton, UiDialog, UiInput } from '@/shared/ui'

const open = ref(false)
const name = ref('')
const loading = ref(false)

async function create() {
  const n = name.value.trim()
  if (!n) return
  loading.value = true
  try {
    const p = await $fetch<{ id: string }>('/api/playlists', { method: 'POST', body: { name: n } })
    open.value = false
    name.value = ''
    refreshPlaylists()
    await navigateTo(`/playlist/${p.id}`)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UiButton @click="open = true">
    <template #icon>
      <Plus />
    </template>
    Новый плейлист
  </UiButton>

  <UiDialog v-model:open="open" title="Новый плейлист">
    <form class="create" @submit.prevent="create">
      <UiInput v-model="name" placeholder="Название" autofocus />
      <UiButton type="submit" variant="primary" :loading="loading" :disabled="!name.trim()">
        Создать
      </UiButton>
    </form>
  </UiDialog>
</template>

<style lang="scss" scoped>
.create {
  display: grid;
  gap: var(--space-3);
}
</style>
