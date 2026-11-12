<script setup lang="ts">
import { ChartColumn } from 'lucide-vue-next'
import { usePlayer } from '@/entities/player'
import { artistHref } from '@/entities/track'
import { plural, useCachedFetch } from '@/shared/lib'
import { UiColumnChart, UiCover, UiEmptyState, UiPageHeader, UiSegmented, UiSpinner } from '@/shared/ui'

/** «Ваш год» — личная статистика прослушиваний (по истории сайта). */
const range = ref<StatsRange>('year')
const tz = import.meta.client ? new Date().getTimezoneOffset() : 0
const { data, status } = useCachedFetch<ListeningStats>(() => `/api/stats?range=${range.value}&tz=${tz}`, {
  key: 'stats',
  ttl: 60_000,
})
const player = usePlayer()

const RANGES: { value: StatsRange, label: string }[] = [
  { value: 'month', label: '30 дней' },
  { value: 'year', label: `${new Date().getFullYear()} год` },
  { value: 'all', label: 'Всё время' },
]

const fmt = (n: number) => n.toLocaleString('ru-RU')
const plays = (n: number) => `${fmt(n)} ${plural(n, ['прослушивание', 'прослушивания', 'прослушиваний'])}`
const hours = computed(() => (data.value ? Math.floor(data.value.minutes / 60) : 0))

const peakHour = computed(() => {
  const h = data.value?.byHour
  if (!h?.some(b => b.value)) return null
  const i = h.reduce((best, b, k) => (b.value > h[best]!.value ? k : best), 0)
  return i < 6 ? 'ночью' : i < 12 ? 'утром' : i < 18 ? 'днём' : 'вечером'
})

function playTop() {
  const list = data.value?.topTracks.map(t => t.track) ?? []
  if (list.length) player.playQueue(list, 0)
}

useHead({ title: 'Статистика' })
</script>

<template>
  <div class="stats">
    <div class="stats__head">
      <UiPageHeader title="Статистика" subtitle="По тому, что вы слушали на этом сайте" />
      <UiSegmented v-model="range" :options="RANGES" label="Период" />
    </div>

    <div v-if="status === 'pending' && !data" class="stats__loading">
      <UiSpinner />
    </div>

    <UiEmptyState v-else-if="data && !data.plays" title="Пока нечего считать" text="Слушайте музыку — здесь появятся ваши любимые треки, исполнители и привычки.">
      <template #icon>
        <ChartColumn />
      </template>
    </UiEmptyState>

    <template v-else-if="data">
      <!-- Главная цифра и плитки -->
      <section class="stats__hero">
        <div class="stats__figure">
          <span class="stats__figure-value">{{ fmt(data.minutes) }}</span>
          <span class="stats__figure-label">{{ plural(data.minutes, ['минута', 'минуты', 'минут']) }} музыки{{ hours >= 2 ? ` · это ${fmt(hours)} ч` : '' }}</span>
        </div>
        <div class="stats__tiles">
          <div class="tile">
            <span class="tile__label">Прослушиваний</span>
            <span class="tile__value">{{ fmt(data.plays) }}</span>
          </div>
          <div class="tile">
            <span class="tile__label">Разных треков</span>
            <span class="tile__value">{{ fmt(data.uniqueTracks) }}</span>
          </div>
          <div class="tile">
            <span class="tile__label">Исполнителей</span>
            <span class="tile__value">{{ fmt(data.uniqueArtists) }}</span>
          </div>
          <div v-if="peakHour" class="tile">
            <span class="tile__label">Чаще всего слушаете</span>
            <span class="tile__value">{{ peakHour }}</span>
          </div>
        </div>
      </section>

      <div class="stats__pair">
        <section class="stats__panel">
          <h2 class="stats__heading">
            {{ range === 'month' ? 'Прослушивания по дням' : 'Прослушивания по месяцам' }}
          </h2>
          <UiColumnChart
            :data="data.timeline"
            :title="range === 'month' ? 'Прослушивания по дням' : 'Прослушивания по месяцам'"
            :unit="plays"
            :label-every="range === 'month' ? 5 : 1"
          />
        </section>
        <section class="stats__panel">
          <h2 class="stats__heading">
            По времени суток
          </h2>
          <UiColumnChart :data="data.byHour" title="Прослушивания по часам" :unit="plays" :label-every="3" />
        </section>
      </div>

      <div class="stats__pair">
        <section class="stats__panel">
          <div class="stats__heading-row">
            <h2 class="stats__heading">
              Топ треков
            </h2>
            <button type="button" class="stats__link" @click="playTop">
              Слушать
            </button>
          </div>
          <ol class="rank">
            <li v-for="(t, i) in data.topTracks" :key="t.track.uid" class="rank__item">
              <span class="rank__num">{{ i + 1 }}</span>
              <UiCover :src="t.track.coverUrl" :size="40" />
              <span class="rank__text">
                <span class="rank__title">{{ t.track.title }}</span>
                <span class="rank__sub">{{ t.track.artists.join(', ') }}</span>
              </span>
              <span class="rank__count">{{ fmt(t.plays) }}</span>
            </li>
          </ol>
        </section>
        <section class="stats__panel">
          <h2 class="stats__heading">
            Топ исполнителей
          </h2>
          <ol class="rank">
            <li v-for="(a, i) in data.topArtists" :key="a.name" class="rank__item">
              <span class="rank__num">{{ i + 1 }}</span>
              <UiCover :src="a.coverUrl" :size="40" rounded="full" />
              <NuxtLink
                class="rank__text rank__title"
                :to="artistHref({ uid: '', source: a.source, sourceId: '', title: '', artists: [a.name], artistIds: a.artistId ? [a.artistId] : undefined, durationMs: 0 }, 0)"
              >
                {{ a.name }}
              </NuxtLink>
              <span class="rank__count">{{ fmt(a.plays) }}</span>
            </li>
          </ol>
        </section>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.stats {
  display: grid;
  gap: var(--space-5);

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;

    :deep(.page-header) {
      margin-bottom: 0;
    }
  }

  &__loading {
    display: grid;
    place-items: center;
    padding: var(--space-7);
    font-size: 24px;
  }

  &__hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    align-items: center;
    gap: var(--space-5);

    @include down(lg) {
      grid-template-columns: 1fr;
    }
  }

  // Одна главная цифра на экран
  &__figure {
    display: grid;
  }

  &__figure-value {
    font-size: clamp(3rem, 7vw, 5rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1;
  }

  &__figure-label {
    margin-top: var(--space-2);
    color: var(--c-text-muted);
  }

  &__tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-2);
  }

  &__pair {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-4);

    @include down(lg) {
      grid-template-columns: 1fr;
    }
  }

  &__panel {
    @include glass;

    display: grid;
    align-content: start;
    gap: var(--space-3);
    min-width: 0;
    padding: var(--space-4) var(--space-4) var(--space-3);
    border-radius: var(--radius-lg);
  }

  &__heading {
    font-size: var(--fs-lg);
    font-weight: 700;
  }

  &__heading-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__link {
    @include reset-button;

    color: var(--c-text-muted);
    font-size: var(--fs-sm);
    font-weight: 600;

    @include hover {
      color: var(--c-text);
    }
  }
}

.tile {
  @include glass;

  display: grid;
  gap: 2px;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);

  &__label {
    color: var(--c-text-muted);
    font-size: var(--fs-xs);
  }

  &__value {
    font-size: var(--fs-xl);
    font-weight: 700;
  }
}

.rank {
  display: grid;
  gap: 2px;

  &__item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: 4px var(--space-2);
    border-radius: var(--radius-md);
  }

  &__num {
    width: 20px;
    flex: none;
    color: var(--c-text-subtle);
    font-size: var(--fs-sm);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  &__text {
    display: grid;
    flex: 1;
    min-width: 0;
  }

  &__title {
    @include truncate;

    font-weight: 500;
  }

  a.rank__title:hover {
    text-decoration: underline;
  }

  &__sub {
    @include truncate;

    color: var(--c-text-muted);
    font-size: var(--fs-xs);
  }

  &__count {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
    font-variant-numeric: tabular-nums;
  }
}
</style>
