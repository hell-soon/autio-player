<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { PlaylistCover, refreshPlaylists, usePlaylists } from '@/entities/library'
import { UiButton, UiDialog, UiInput, useToast } from '@/shared/ui'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{
  track?: Track | null
  /** Несколько треков сразу (выбор в списке) — вместо track */
  tracks?: Track[]
}>()
const emit = defineEmits<{ done: [] }>()
const list = computed(() => props.tracks?.length ? props.tracks : props.track ? [props.track] : [])

const { data: playlists } = usePlaylists()
const toast = useToast()
const newName = ref('')
const creating = ref(false)

async function add(id: string, name: string) {
  const tracks = list.value
  if (!tracks.length) return
  open.value = false
  try {
    if (tracks.length === 1) {
      const res = await $fetch<{ added: boolean }>(`/api/playlists/${id}/tracks`, { method: 'POST', body: { track: tracks[0] } })
      toast.show(res.added ? `Добавлено в «${name}»` : `Уже есть в «${name}»`)
    }
    else {
      const res = await $fetch<{ added: number }>(`/api/playlists/${id}/tracks/batch`, { method: 'POST', body: { tracks } })
      toast.show(res.added ? `Добавлено в «${name}»: ${res.added}` : `Всё уже есть в «${name}»`)
    }
    emit('done')
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
  <UiDialog v-model:open="open" :title="list.length > 1 ? `Добавить в плейлист: ${list.length}` : 'Добавить в плейлист'">
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
          <PlaylistCover :covers="p.covers" :name="p.name" :size="44" />
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

  // min-width: 0 — иначе поле не сжимается и «Создать» уезжает за край на узких экранах (iPhone SE)
  > :first-child {
    flex: 1;
    min-width: 0;
  }

  > :last-child {
    flex: none;
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
