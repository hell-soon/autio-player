<script setup lang="ts">
import { ListEnd, ListPlus, ListStart, Trash2, X } from 'lucide-vue-next'
import { AddToPlaylistDialog } from '@/features/add-to-playlist'
import { TrackInfoDialog } from '@/features/track-info'
import { LikeButton } from '@/features/like-track'
import { ShareWithFriendDialog } from '@/features/share-with-friend'
import { TrackMenu } from '@/features/track-actions'
import { usePlayer } from '@/entities/player'
import { TrackRow } from '@/entities/track'
import { UiButton, UiIconButton, useToast } from '@/shared/ui'

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
const emit = defineEmits<{ remove: [tracks: Track[]] }>()

const player = usePlayer()
const toast = useToast()
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

// «Сведения о треке»
const infoTrack = ref<Track | null>(null)
const infoOpen = computed({
  get: () => infoTrack.value !== null,
  set: (v) => {
    if (!v) infoTrack.value = null
  },
})

// ---------- Выбор нескольких ----------
// Номера строк (не uid: один трек может стоять в списке дважды)
const selected = ref(new Set<number>())
const selecting = ref(false)
const selectedTracks = computed(() => [...selected.value].sort((a, b) => a - b).map(i => props.tracks[i]).filter((t): t is Track => !!t))
const bulkAddOpen = ref(false)

function startSelect(i: number) {
  selecting.value = true
  selected.value = new Set([i])
}
function toggleSelect(i: number) {
  const s = new Set(selected.value)
  if (s.has(i)) s.delete(i)
  else s.add(i)
  selected.value = s
}
function stopSelect() {
  selecting.value = false
  selected.value = new Set()
}
function selectAll() {
  selected.value = selected.value.size === props.tracks.length ? new Set() : new Set(props.tracks.map((_, i) => i))
}
// Список сменился (другая страница, удаление) — выбор по номерам уже неверен
watch(() => props.tracks, stopSelect)
onBeforeUnmount(stopSelect)
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && selecting.value) stopSelect()
}
watch(selecting, (on) => {
  if (import.meta.server) return
  if (on) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})

function bulkNext() {
  // В обратном порядке: каждый встаёт сразу после текущего — итог в исходном порядке
  for (const t of [...selectedTracks.value].reverse()) player.playNext(t)
  toast.show(`Сыграют следующими: ${selectedTracks.value.length}`)
  stopSelect()
}
function bulkQueue() {
  player.addToQueue(selectedTracks.value)
  toast.show(`Добавлено в очередь: ${selectedTracks.value.length}`)
  stopSelect()
}
function bulkRemove() {
  emit('remove', selectedTracks.value)
  stopSelect()
}

// Клик по треку ставит весь список в очередь — «следующий» продолжит по нему.
function play(i: number) {
  if (selecting.value) return toggleSelect(i)
  const t = props.tracks[i]!
  if (player.current.value?.uid === t.uid) {
    player.toggle()
    return
  }
  player.playQueue(props.tracks, i)
}
</script>

<template>
  <ol ref="listEl" class="track-list" :class="{ 'is-columns': columns, 'is-selecting': selecting }" :style="columns ? { '--cols': columns } : undefined">
    <li v-for="(t, i) in tracks" :key="`${t.uid}-${i}`" :class="{ 'is-highlight': highlight === t.uid }" :data-uid="t.uid">
      <TrackRow
        :track="t"
        :position="numbered ? i + 1 : undefined"
        :active="player.current.value?.uid === t.uid"
        :playing="player.isPlaying.value"
        :show-cover="showCover"
        :show-album="showAlbum"
        :show-source="showSource"
        :selecting="selecting"
        :selected="selected.has(i)"
        @play="play(i)"
        @pointerdown="player.warmTrack(t)"
      >
        <template #actions>
          <LikeButton :track="t" />
        </template>
        <template #menu>
          <TrackMenu
            :track="t"
            :removable="removable"
            selectable
            @add-to-playlist="dialogTrack = t"
            @share-friend="shareTrack = t"
            @info="infoTrack = t"
            @select="startSelect(i)"
            @remove="emit('remove', [t])"
          />
        </template>
      </TrackRow>
    </li>
  </ol>

  <AddToPlaylistDialog v-model:open="dialogOpen" :track="dialogTrack" />
  <ShareWithFriendDialog v-model:open="shareOpen" :track="shareTrack" />
  <TrackInfoDialog v-model:open="infoOpen" :track="infoTrack" />
  <AddToPlaylistDialog v-model:open="bulkAddOpen" :tracks="selectedTracks" @done="stopSelect" />

  <!-- Панель действий с выбранными треками -->
  <Teleport to="body">
    <Transition name="select-bar">
      <div v-if="selecting" class="select-bar" role="toolbar" aria-label="Выбранные треки">
        <UiIconButton label="Отменить выбор" size="sm" @click="stopSelect">
          <X />
        </UiIconButton>
        <button type="button" class="select-bar__count" :aria-label="selected.size === tracks.length ? `Выбрано: ${selected.size}. Снять выбор` : `Выбрано: ${selected.size}. Выбрать все`" @click="selectAll">
          <template v-if="selected.size">
            <span class="select-bar__long">Выбрано: </span>{{ selected.size }}
          </template>
          <template v-else>
            Все
          </template>
        </button>
        <div class="select-bar__actions">
          <UiIconButton label="Играть следующими" :disabled="!selected.size" @click="bulkNext">
            <ListStart />
          </UiIconButton>
          <UiIconButton label="В очередь" :disabled="!selected.size" @click="bulkQueue">
            <ListEnd />
          </UiIconButton>
          <UiIconButton label="В плейлист" :disabled="!selected.size" @click="bulkAddOpen = true">
            <ListPlus />
          </UiIconButton>
          <UiIconButton v-if="removable" label="Удалить из плейлиста" :disabled="!selected.size" class="select-bar__danger" @click="bulkRemove">
            <Trash2 />
          </UiIconButton>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.select-bar {
  @include glass(true);

  position: fixed;
  left: 50%;
  bottom: calc(var(--player-height) + var(--space-4));
  z-index: 60;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: min(560px, calc(100vw - var(--space-4) * 2));
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-lg);
  transform: translateX(-50%);

  @include down(md) {
    bottom: calc(var(--mobile-nav-height) + var(--mini-player-height) + env(safe-area-inset-bottom) + var(--space-3));
  }

  &__count {
    @include reset-button;
    @include truncate;

    min-width: 0;
    font-size: var(--fs-sm);
    font-weight: 700;
  }

  &__actions {
    display: flex;
    gap: 2px;
    margin-left: auto;
  }

  &__danger {
    color: var(--c-danger);
  }

  &__long {
    @include down(sm) {
      display: none;
    }
  }
}

.select-bar-enter-active,
.select-bar-leave-active {
  transition: opacity var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease);
}

.select-bar-enter-from,
.select-bar-leave-to {
  opacity: 0;
  transform: translate(-50%, 16px);
}

.track-list {
  display: grid;
  // minmax(0, …): длинные названия обрезаются многоточием, а не растягивают список за край экрана
  grid-template-columns: minmax(0, 1fr);
  gap: 2px;

  // Панель выбора не закрывает последние строки
  &.is-selecting {
    padding-bottom: 80px;
  }

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
