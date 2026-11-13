<script setup lang="ts">
import { Clock3, ListEnd, Music2, Play, Search, Shuffle } from 'lucide-vue-next'
import { usePlayer } from '@/entities/player'
import { PlaylistCover } from '@/entities/library'
import { formatTotalDuration, plural } from '@/shared/lib'
import { UiButton, UiChip, UiCover, UiEmptyState, UiIconButton, UiInput, useToast } from '@/shared/ui'

/**
 * Шапка коллекции (обложка, название, плашки, кнопки) + стеклянная панель списка.
 * Сам список передаётся слотом: `<template #default="{ tracks, isAlbum }">` —
 * так виджет не зависит от виджета списка треков (правило FSD).
 */
const props = defineProps<{
  collection: Collection
  /** Обложки для коллажа (плейлист) */
  covers?: string[]
}>()

const player = usePlayer()
const toast = useToast()
const filter = ref('')

const kindLabel = computed(() => ({ album: 'Альбом', playlist: 'Плейлист', liked: 'Коллекция' })[props.collection.kind])
const total = computed(() => props.collection.tracks.reduce((s, t) => s + t.durationMs, 0))
const count = computed(() => props.collection.tracks.length)

const visible = computed(() => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return props.collection.tracks
  return props.collection.tracks.filter(t =>
    t.title.toLowerCase().includes(q) || t.artists.some(a => a.toLowerCase().includes(q)),
  )
})

const isAlbum = computed(() => props.collection.kind === 'album')

function playAll() {
  if (count.value) player.playQueue(props.collection.tracks, 0, { shuffle: false })
}
function shuffleAll() {
  if (count.value) player.playQueue(props.collection.tracks, 0, { shuffle: true })
}
function queueAll() {
  player.addToQueue(props.collection.tracks)
  toast.show(`${count.value} ${plural(count.value, ['трек добавлен', 'трека добавлено', 'треков добавлено'])} в очередь`)
}
</script>

<template>
  <div class="collection">
    <header class="collection__header">
      <PlaylistCover v-if="covers" :covers="covers" :size="200" class="collection__cover" />
      <UiCover v-else :src="collection.coverUrl" :size="200" rounded="md" class="collection__cover" />

      <div class="collection__info">
        <span class="collection__kind">{{ kindLabel }}</span>
        <h1 class="collection__title">
          {{ collection.title }}
        </h1>
        <p v-if="collection.subtitle" class="collection__subtitle">
          {{ collection.subtitle }}
        </p>
        <div class="collection__chips">
          <UiChip v-if="collection.year">
            {{ collection.year }}
          </UiChip>
          <UiChip>
            <Music2 /> {{ count }} {{ plural(count, ['трек', 'трека', 'треков']) }}
          </UiChip>
          <UiChip v-if="total">
            <Clock3 /> {{ formatTotalDuration(total) }}
          </UiChip>
        </div>
      </div>
    </header>

    <div class="collection__toolbar">
      <UiButton variant="primary" :disabled="!count" @click="playAll">
        <template #icon>
          <Play fill="currentColor" />
        </template>
        Слушать
      </UiButton>
      <UiIconButton label="Перемешать" variant="filled" :disabled="!count" @click="shuffleAll">
        <Shuffle />
      </UiIconButton>
      <UiIconButton label="Добавить всё в очередь" variant="filled" :disabled="!count" @click="queueAll">
        <ListEnd />
      </UiIconButton>
      <slot name="actions" />

      <UiInput v-if="count > 8" v-model="filter" type="search" placeholder="Поиск в списке" clearable class="collection__filter">
        <template #icon>
          <Search />
        </template>
      </UiInput>
    </div>

    <section class="collection__list">
      <slot name="empty">
        <UiEmptyState v-if="!count" title="Здесь пока пусто" />
      </slot>
      <slot v-if="visible.length" :tracks="visible" :is-album="isAlbum" />
      <p v-else-if="count" class="collection__no-match">
        Ничего не найдено
      </p>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.collection {
  display: grid;
  // minmax(0, …): иначе колонка растягивается под самое длинное название трека и страница уезжает вбок
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-5);

  &__header {
    display: flex;
    align-items: flex-end;
    gap: var(--space-5);

    @include down(md) {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
  }

  &__cover {
    box-shadow: var(--shadow-lg);

    @include down(md) {
      width: 180px !important;
      height: 180px !important;
    }
  }

  &__info {
    display: grid;
    justify-items: start;
    gap: var(--space-1);
    min-width: 0;

    @include down(md) {
      justify-items: center;
      width: 100%;
    }
  }

  &__kind {
    color: var(--c-text-muted);
    font-size: var(--fs-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  &__title {
    display: -webkit-box;
    overflow: hidden;
    font-size: clamp(1.75rem, 4vw, 3rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.05;
    overflow-wrap: anywhere;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  &__subtitle {
    max-width: 100%;
    color: var(--c-text-muted);
    font-size: var(--fs-lg);
    overflow-wrap: anywhere;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-2);

    @include down(md) {
      justify-content: center;
    }
  }

  &__toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;

    @include down(md) {
      justify-content: center;
    }
  }

  &__filter {
    width: 240px;
    height: 40px;
    margin-left: auto;

    @include down(md) {
      width: 100%;
      margin-left: 0;
    }
  }

  &__list {
    @include glass;

    padding: var(--space-2);
    border-radius: var(--radius-lg);
  }

  &__no-match {
    padding: var(--space-5);
    color: var(--c-text-muted);
    text-align: center;
  }
}
</style>
