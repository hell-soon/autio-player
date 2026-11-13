<script setup lang="ts">
import { Ellipsis, Pencil, Trash2, Upload } from 'lucide-vue-next'
import ExportDialog from './ExportDialog.vue'
import { refreshPlaylists } from '@/entities/library'
import { UiButton, UiDialog, UiIconButton, UiInput, UiMenu, useToast, type UiMenuItem } from '@/shared/ui'

const props = defineProps<{ id: string, name: string }>()
const emit = defineEmits<{ renamed: [] }>()
const toast = useToast()

const renameOpen = ref(false)
const newName = ref('')
const exportTo = ref<TrackSource | null>(null)
const exportOpen = ref(false)
function startExport(to: TrackSource) {
  exportTo.value = to
  exportOpen.value = true
}

const items: UiMenuItem[] = [
  { label: 'Переименовать', icon: Pencil, action: () => {
    newName.value = props.name
    renameOpen.value = true
  } },
  { label: 'Экспорт в Spotify', icon: Upload, action: () => startExport('spotify') },
  { label: 'Экспорт в Яндекс Музыку', icon: Upload, action: () => startExport('yandex') },
  { label: 'Удалить плейлист', icon: Trash2, danger: true, action: remove },
]

async function rename() {
  const name = newName.value.trim()
  if (!name) return
  await $fetch(`/api/playlists/${props.id}`, { method: 'PATCH', body: { name } })
  renameOpen.value = false
  refreshPlaylists()
  emit('renamed')
}

async function remove() {
  if (!confirm(`Удалить плейлист «${props.name}»?`)) return
  await $fetch(`/api/playlists/${props.id}`, { method: 'DELETE' })
  refreshPlaylists()
  toast.show('Плейлист удалён')
  await navigateTo('/library')
}
</script>

<template>
  <UiMenu :items="items" label="Действия с плейлистом">
    <UiIconButton label="Ещё" variant="filled">
      <Ellipsis />
    </UiIconButton>
  </UiMenu>

  <ExportDialog v-model:open="exportOpen" :playlist-id="id" :to="exportTo" />

  <UiDialog v-model:open="renameOpen" title="Переименовать плейлист">
    <form class="rename" @submit.prevent="rename">
      <UiInput v-model="newName" placeholder="Название" autofocus />
      <UiButton type="submit" variant="primary" :disabled="!newName.trim()">
        Сохранить
      </UiButton>
    </form>
  </UiDialog>
</template>

<style lang="scss" scoped>
.rename {
  display: grid;
  gap: var(--space-3);
}
</style>
