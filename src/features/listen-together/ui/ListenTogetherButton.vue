<script setup lang="ts">
import { Headphones } from 'lucide-vue-next'
import { UiButton } from '@/shared/ui'
import { useListenTogether } from '../model/listen-together'

/** «Слушать вместе» с другом: показывается, когда у друга что-то играет. */
const props = defineProps<{ friend: { id: string, name: string }, nowPlaying: FriendNowPlaying | null, size?: 'sm' | 'md' }>()
const together = useListenTogether()
const active = computed(() => together.friend.value?.id === props.friend.id)
</script>

<template>
  <UiButton
    v-if="nowPlaying"
    :variant="active ? 'secondary' : 'primary'"
    :size="size ?? 'md'"
    :aria-label="active ? 'Перестать слушать вместе' : `Слушать вместе: ${friend.name}`"
    @click.stop.prevent="active ? together.stop() : together.start(friend, nowPlaying)"
  >
    <template #icon>
      <Headphones />
    </template>
    {{ active ? 'Перестать' : 'Слушать вместе' }}
  </UiButton>
</template>
