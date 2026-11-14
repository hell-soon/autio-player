<script setup lang="ts">
import { formatDuration, genreLabel, plural } from '@/shared/lib'
import { UiCover, UiDialog, UiSkeleton } from '@/shared/ui'

/** «Сведения о треке»: альбом, год, жанр, лейбл, качество, где ещё есть и ваша статистика. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ track: Track | null }>()

const info = ref<TrackDetails | null>(null)
const failed = ref(false)
let seq = 0
watch([open, () => props.track?.uid], async ([o]) => {
  if (!o || !props.track) return
  const id = ++seq
  info.value = null
  failed.value = false
  try {
    const r = await $fetch<TrackDetails>('/api/tracks/info', { method: 'POST', body: { track: props.track } })
    if (id === seq) info.value = r
  }
  catch {
    if (id === seq) failed.value = true
  }
}, { immediate: true })

const date = (ms?: number) => (ms ? new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
const SOURCE = { yandex: 'Яндекс Музыка', spotify: 'Spotify' } as const

const rows = computed(() => {
  const t = props.track
  const i = info.value
  if (!t) return []
  const list: { label: string, value: string }[] = [
    { label: 'Альбом', value: t.album ?? '' },
    { label: 'Год', value: i?.year ? String(i.year) : '' },
    { label: 'Жанр', value: genreLabel(i?.genre) },
    { label: 'Лейбл', value: i?.label ?? '' },
    { label: 'Длительность', value: t.durationMs ? formatDuration(t.durationMs) : '' },
    { label: 'Источник', value: SOURCE[t.source] + (i?.alsoIn ? ` · есть и в ${SOURCE[i.alsoIn]}` : '') },
    { label: 'Качество', value: i?.quality ?? '' },
    { label: 'Вы слушали', value: i ? (i.plays ? `${i.plays} ${plural(i.plays, ['раз', 'раза', 'раз'])}` : 'ещё не слушали') : '' },
    { label: 'Впервые', value: date(i?.firstPlayedAt) },
    { label: 'В любимых с', value: date(i?.likedAt) },
  ]
  return list.filter(r => r.value)
})

</script>

<template>
  <UiDialog v-model:open="open" title="Сведения о треке">
    <div v-if="track" class="info">
      <div class="info__head">
        <UiCover :src="track.coverUrl" :size="64" rounded="md" />
        <div class="info__text">
          <strong class="info__title">{{ track.title }}</strong>
          <span class="info__artists">{{ track.artists.join(', ') }}</span>
        </div>
      </div>
      <dl class="info__list">
        <div v-for="r in rows" :key="r.label" class="info__row">
          <dt>{{ r.label }}</dt>
          <dd>{{ r.value }}</dd>
        </div>
      </dl>
      <div v-if="!info && !failed" class="info__loading" aria-label="Загрузка">
        <UiSkeleton v-for="n in 3" :key="n" height="18px" />
      </div>
      <p v-if="failed" class="info__error">
        Не удалось загрузить подробности
      </p>
    </div>
  </UiDialog>
</template>

<style lang="scss" scoped>
.info {
  display: grid;
  gap: var(--space-4);

  &__head {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }

  &__text {
    display: grid;
    min-width: 0;
  }

  &__title {
    @include truncate;
  }

  &__artists {
    @include truncate;

    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__list {
    display: grid;
    gap: 2px;
  }

  &__row {
    display: grid;
    grid-template-columns: 120px minmax(0, 1fr);
    gap: var(--space-3);
    padding: 6px 0;
    border-bottom: 1px solid var(--c-border);
    font-size: var(--fs-sm);

    dt {
      color: var(--c-text-muted);
    }

    dd {
      overflow-wrap: anywhere;
    }
  }

  &__loading {
    display: grid;
    gap: var(--space-2);
  }

  &__error {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }
}
</style>
