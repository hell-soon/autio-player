<script setup lang="ts">
import { useCachedFetch } from '@/shared/lib'
import { ListMusic } from 'lucide-vue-next'
import { PlaylistMenu } from '@/features/manage-playlist'
import { refreshPlaylists } from '@/entities/library'
import { CollectionSkeleton, CollectionView } from '@/widgets/collection-view'
import { TrackList } from '@/widgets/track-list'
import { UiButton, UiEmptyState, useToast } from '@/shared/ui'

const props = defineProps<{ id: string }>()
const toast = useToast()

const { data, status, error, refresh } = useCachedFetch<Collection>(() => `/api/playlists/${props.id}`, {
  key: `playlist:${props.id}`,
})

useHead({ title: () => data.value?.title ?? 'Плейлист' })

const covers = computed(() => [...new Set((data.value?.tracks ?? []).map(t => t.coverUrl).filter(Boolean) as string[])].slice(0, 4))

/** Удаление одного или нескольких треков; «Отменить» возвращает их на прежние места */
async function remove(list: Track[]) {
  const id = props.id
  let removed: { uid: string, position: number }[]
  try {
    ({ removed } = await $fetch<{ removed: { uid: string, position: number }[] }>(`/api/playlists/${id}/tracks/batch-delete`, {
      method: 'POST',
      body: { uids: list.map(t => t.uid) },
    }))
  }
  catch {
    toast.error('Не удалось удалить')
    return
  }
  const byUid = new Map(list.map(t => [t.uid, t]))
  const items = removed.flatMap(r => (byUid.has(r.uid) ? [{ track: byUid.get(r.uid)!, position: r.position }] : []))
  const text = list.length > 1 ? `Удалено из плейлиста: ${removed.length}` : 'Удалено из плейлиста'
  toast.show(text, 'default', 6000, {
    label: 'Отменить',
    run: async () => {
      try {
        await $fetch(`/api/playlists/${id}/tracks/restore`, { method: 'POST', body: { items } })
        refreshNuxtData(`playlist:${id}`)
        refreshPlaylists()
      }
      catch {
        toast.error('Не удалось вернуть')
      }
    },
  })
  await refresh()
  refreshPlaylists()
}
</script>

<template>
  <CollectionSkeleton v-if="status === 'pending' && !data" />
  <UiEmptyState v-else-if="error || !data" title="Плейлист не найден">
    <UiButton to="/library">
      В библиотеку
    </UiButton>
  </UiEmptyState>
  <CollectionView v-else :collection="data" :covers="covers">
    <template #actions>
      <PlaylistMenu :id="data.id" :name="data.title" @renamed="refresh()" />
    </template>
    <template #empty>
      <UiEmptyState v-if="!data.tracks.length" title="В плейлисте пока нет треков" text="Добавляйте треки через меню «⋮» → «Добавить в плейлист».">
        <template #icon>
          <ListMusic />
        </template>
        <UiButton to="/search" variant="primary">
          Найти музыку
        </UiButton>
      </UiEmptyState>
    </template>
    <template #default="{ tracks }">
      <TrackList :tracks="tracks" removable @remove="remove" />
    </template>
  </CollectionView>
</template>

<style lang="scss" scoped>
.loading {
  display: grid;
  place-items: center;
  padding: var(--space-7);
  font-size: 24px;
}
</style>
