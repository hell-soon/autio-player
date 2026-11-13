<script setup lang="ts">
import { Disc3, EllipsisVertical, ListEnd, ListPlus, ListStart, Send, Share2, Trash2 } from 'lucide-vue-next'
import { usePlayer } from '@/entities/player'
import { shareHref } from '@/entities/track'
import { UiIconButton, UiMenu, useToast, type UiMenuItem } from '@/shared/ui'

const props = defineProps<{
  track: Track
  /** Показать «Удалить из плейлиста» */
  removable?: boolean
}>()
const emit = defineEmits<{ 'add-to-playlist': [], 'share-friend': [], 'remove': [] }>()

const player = usePlayer()
const toast = useToast()

async function share() {
  const url = shareHref(props.track)
  const title = `${props.track.artists.join(', ')} — ${props.track.title}`
  // На телефоне — системное меню «Поделиться», на компьютере — копирование ссылки.
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    await navigator.share({ title, url }).catch(() => {})
    return
  }
  await navigator.clipboard?.writeText(url).catch(() => {})
  toast.show('Ссылка скопирована')
}

const items = computed<UiMenuItem[]>(() => [
  { label: 'Играть следующим', icon: ListStart, action: () => {
    player.playNext(props.track)
    toast.show('Сыграет следующим')
  } },
  { label: 'Добавить в очередь', icon: ListEnd, action: () => {
    player.addToQueue([props.track])
    toast.show('Добавлено в очередь')
  } },
  { label: 'Добавить в плейлист', icon: ListPlus, action: () => emit('add-to-playlist') },
  ...(props.track.albumId
    ? [{ label: 'Перейти к альбому', icon: Disc3, action: () => navigateTo(`/album/${props.track.source}:${props.track.albumId}`) }]
    : []),
  { label: 'Отправить другу', icon: Send, action: () => emit('share-friend') },
  { label: 'Поделиться ссылкой', icon: Share2, action: share },
  ...(props.removable
    ? [{ label: 'Удалить из плейлиста', icon: Trash2, danger: true, action: () => emit('remove') }]
    : []),
])
</script>

<template>
  <UiMenu :items="items" label="Действия с треком">
    <UiIconButton label="Ещё" size="sm">
      <EllipsisVertical />
    </UiIconButton>
  </UiMenu>
</template>
