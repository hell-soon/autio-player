<script setup lang="ts">
import { History, Search } from 'lucide-vue-next'
import { usePlayer } from '@/entities/player'
import { TrackRow } from '@/entities/track'
import { UiButton, UiEmptyState, UiInput, UiPageHeader, UiSkeletonRows } from '@/shared/ui'

/** История прослушиваний: по дням, со временем, поиск по названию/исполнителю, подгрузка старого. */
const p = usePlayer()
const q = ref('')
const entries = ref<HistoryEntry[]>([])
const loading = ref(false)
const done = ref(false)
let reqId = 0

async function load(reset: boolean) {
  const id = ++reqId
  loading.value = true
  try {
    const before = reset ? undefined : entries.value.at(-1)?.playedAt
    const list = await $fetch<HistoryEntry[]>('/api/history/log', { query: { q: q.value || undefined, before, limit: 60 } })
    if (id !== reqId) return
    entries.value = reset ? list : [...entries.value, ...list]
    done.value = list.length < 60
  }
  finally {
    if (id === reqId) loading.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(q, () => {
  clearTimeout(timer)
  timer = setTimeout(() => load(true), 300)
})
onMounted(() => load(true))

const DAY = 86_400_000
function dayLabel(ts: number) {
  const d = new Date(ts)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / DAY)
  if (diff === 0) return 'Сегодня'
  if (diff === 1) return 'Вчера'
  return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}) })
}
const time = (ts: number) => new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

/** Группы по дням (история уже отсортирована от новых к старым) */
const groups = computed(() => {
  const out: { label: string, items: { e: HistoryEntry, i: number }[] }[] = []
  entries.value.forEach((e, i) => {
    const label = dayLabel(e.playedAt)
    if (out.at(-1)?.label !== label) out.push({ label, items: [] })
    out.at(-1)!.items.push({ e, i })
  })
  return out
})

/** Включить трек и дальше — то, что играло после него в тот день (как «продолжить с этого места») */
function play(i: number) {
  const list = entries.value.slice(0, i + 1).reverse().map(e => e.track)
  p.playQueue(list, 0)
}
</script>

<template>
  <div class="history">
    <UiPageHeader title="История" subtitle="Всё, что играло на этом сайте" />
    <UiInput v-model="q" type="search" placeholder="Название или исполнитель" clearable class="history__search">
      <template #icon>
        <Search />
      </template>
    </UiInput>

    <UiSkeletonRows v-if="loading && !entries.length" :count="8" />
    <UiEmptyState
      v-else-if="!entries.length"
      :title="q ? 'Ничего не нашлось' : 'История пока пуста'"
      :text="q ? 'Попробуйте другое название или исполнителя.' : 'Включите что-нибудь — здесь появится каждый прослушанный трек.'"
    >
      <template #icon>
        <History />
      </template>
    </UiEmptyState>

    <template v-else>
      <section v-for="g in groups" :key="g.label" class="history__day">
        <h2 class="history__heading">
          {{ g.label }}
        </h2>
        <ol class="history__list">
          <li v-for="{ e, i } in g.items" :key="`${e.playedAt}-${e.track.uid}`" class="history__item">
            <span class="history__time">{{ time(e.playedAt) }}</span>
            <TrackRow
              :track="e.track"
              :active="p.current.value?.uid === e.track.uid"
              :playing="p.isPlaying.value"
              :show-album="false"
              class="history__row"
              @play="play(i)"
            />
          </li>
        </ol>
      </section>
      <UiButton v-if="!done" :loading="loading" class="history__more" @click="load(false)">
        Показать ещё
      </UiButton>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.history {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
  max-width: 900px;

  &__search {
    max-width: 480px;
  }

  &__day {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-2);
  }

  &__heading {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;

    &::first-letter {
      text-transform: uppercase;
    }
  }

  &__list {
    @include glass;

    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 2px;
    padding: var(--space-2);
    border-radius: var(--radius-lg);
    list-style: none;
  }

  &__item {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  &__time {
    flex: none;
    width: 48px;
    padding-left: var(--space-2);
    color: var(--c-text-subtle);
    font-size: var(--fs-xs);
    font-variant-numeric: tabular-nums;
  }

  &__row {
    flex: 1;
    min-width: 0;
  }

  &__more {
    justify-self: center;
  }
}
</style>
