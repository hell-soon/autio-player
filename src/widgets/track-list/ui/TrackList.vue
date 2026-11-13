<script setup lang="ts">
import { AddToPlaylistDialog } from '@/features/add-to-playlist'
import { LikeButton } from '@/features/like-track'
import { ShareWithFriendDialog } from '@/features/share-with-friend'
import { TrackMenu } from '@/features/track-actions'
import { usePlayer } from '@/entities/player'
import { TrackRow } from '@/entities/track'

const props = withDefaults(defineProps<{
  tracks: Track[]
  showCover?: boolean
  showAlbum?: boolean
  showSource?: boolean
  /** Строки можно удалять (плейлист) */
  removable?: boolean
  /** Компактная сетка в несколько колонок (главная) */
  columns?: number
  /** Нумерация строк */
  numbered?: boolean
  /** Подсветить трек (переход по ссылке «поделиться») */
  highlight?: string
}>(), {
  numbered: true,
  showCover: true,
  showAlbum: true,
  showSource: false,
})
const emit = defineEmits<{ remove: [track: Track] }>()

const player = usePlayer()
const listEl = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!props.highlight) return
  const el = listEl.value?.querySelector<HTMLElement>(`[data-uid="${CSS.escape(props.highlight)}"]`)
  el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
})
const dialogTrack = ref<Track | null>(null)
const dialogOpen = computed({
  get: () => dialogTrack.value !== null,
  set: (v) => {
    if (!v) dialogTrack.value = null
  },
})
// «Отправить другу»
const shareTrack = ref<Track | null>(null)
const shareOpen = computed({
  get: () => shareTrack.value !== null,
  set: (v) => {
    if (!v) shareTrack.value = null
  },
})

// Клик по треку ставит весь список в очередь — «следующий» продолжит по нему.
function play(i: number) {
  const t = props.tracks[i]!
  if (player.current.value?.uid === t.uid) {
    player.toggle()
    return
  }
  player.playQueue(props.tracks, i)
}
</script>

<template>
  <ol ref="listEl" class="track-list" :class="{ 'is-columns': columns }" :style="columns ? { '--cols': columns } : undefined">
    <li v-for="(t, i) in tracks" :key="`${t.uid}-${i}`" :class="{ 'is-highlight': highlight === t.uid }" :data-uid="t.uid">
      <TrackRow
        :track="t"
        :position="numbered ? i + 1 : undefined"
        :active="player.current.value?.uid === t.uid"
        :playing="player.isPlaying.value"
        :show-cover="showCover"
        :show-album="showAlbum"
        :show-source="showSource"
        @play="play(i)"
      >
        <template #actions>
          <LikeButton :track="t" />
        </template>
        <template #menu>
          <TrackMenu :track="t" :removable="removable" @add-to-playlist="dialogTrack = t" @share-friend="shareTrack = t" @remove="emit('remove', t)" />
        </template>
      </TrackRow>
    </li>
  </ol>

  <AddToPlaylistDialog v-model:open="dialogOpen" :track="dialogTrack" />
  <ShareWithFriendDialog v-model:open="shareOpen" :track="shareTrack" />
</template>

<style lang="scss" scoped>
.track-list {
  display: grid;
  // minmax(0, …): длинные названия обрезаются многоточием, а не растягивают список за край экрана
  grid-template-columns: minmax(0, 1fr);
  gap: 2px;

  .is-highlight :deep(.track-row) {
    background: var(--c-accent-soft);
    box-shadow: inset 0 0 0 1px var(--c-accent);
  }

  // Колонки заполняются сверху вниз, как «быстрый выбор»; на узких экранах — одна колонка.
  &.is-columns {
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    column-gap: var(--space-2);

    @include down(lg) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @include down(md) {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
</style>
