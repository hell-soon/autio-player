<script setup lang="ts">
import { BookmarkPlus } from 'lucide-vue-next'
import { refreshPlaylists } from '@/entities/library'
import { UiIconButton, useToast } from '@/shared/ui'

/** Сохранить копию плейлиста сервиса или микса в библиотеку сайта. id — как в /collection/:id. */
const props = defineProps<{ id: string }>()
const toast = useToast()
const saving = ref(false)

async function save() {
  saving.value = true
  try {
    const r = await $fetch<ImportPlaylistsResult>('/api/transfer/import', { method: 'POST', body: { ids: [props.id] } })
    const p = r.imported[0]
    if (!p) throw new Error('import failed')
    refreshPlaylists()
    toast.show(`Сохранено в библиотеку: «${p.name}»`)
  }
  catch {
    toast.error('Не удалось сохранить плейлист')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <UiIconButton label="Сохранить в библиотеку" variant="filled" :disabled="saving" @click="save">
    <BookmarkPlus />
  </UiIconButton>
</template>
