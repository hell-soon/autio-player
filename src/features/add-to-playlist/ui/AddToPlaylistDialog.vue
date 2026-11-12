<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { PlaylistCover, refreshPlaylists, usePlaylists } from '@/entities/library'
import { UiButton, UiDialog, UiInput, useToast } from '@/shared/ui'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ track: Track | null }>()

const { data: playlists } = usePlaylists()
const toast = useToast()
const newName = ref('')
const creating = ref(false)

async function add(id: string, name: string) {
  if (!props.track) return
  open.value = false
  try {
    const res = await $fetch<{ added: boolean }>(`/api/playlists/${id}/tracks`, { method: 'POST', body: { track: props.track } })
    toast.show(res.added ? `Добавлено в «${name}»` : `Уже есть в «${name}»`)
    refreshPlaylists()
    refreshNuxtData(`playlist:${id}`)
  }
  catch {
    toast.error('Не удалось добавить')
  }
}

async function createAndAdd() {
  const name = newName.value.trim()
  if (!name) return
  creating.value = true
  try {
    const p = await $fetch<{ id: string, name: string }>('/api/playlists', { method: 'POST', body: { name } })
    newName.value = ''
    await add(p.id, p.name)
  }
  finally {
    creating.value = false
  }
}
</script>

<template>
  <UiDialog v-model:open="open" title="Добавить в плейлист">
    <form class="new-playlist" @submit.prevent="createAndAdd">
      <UiInput v-model="newName" placeholder="Новый плейлист" />
      <UiButton type="submit" variant="primary" :loading="creating" :disabled="!newName.trim()">
        <template #icon>
          <Plus />
        </template>
        Создать
      </UiButton>
    </form>

    <ul v-if="playlists.length" class="playlist-options">
      <li v-for="p in playlists" :key="p.id">
        <button type="button" class="playlist-option" @click="add(p.id, p.name)">
          <PlaylistCover :covers="p.covers" :size="44" />
          <span class="playlist-option__name">{{ p.name }}</span>
          <span class="playlist-option__count">{{ p.count }}</span>
        </button>
      </li>
    </ul>
  </UiDialog>
</template>

<style lang="scss" scoped>
.new-playlist {
  display: flex;
  gap: var(--space-2);

  > :first-child {
    flex: 1;
  }
}

.playlist-options {
  display: grid;
  gap: 2px;
  max-height: 320px;
  margin: 0 calc(var(--space-2) * -1);
  overflow-y: auto;
}

.playlist-option {
  @include reset-button;
  @include focus-ring;

  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  text-align: left;

  @include hover {
    background: var(--c-surface);
  }

  &__name {
    @include truncate;

    flex: 1;
    font-weight: 500;
  }

  &__count {
    color: var(--c-text-subtle);
    font-size: var(--fs-sm);
  }
}
</style>
