<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { UiInput, UiSegmented } from '@/shared/ui'
import { useTrackSearch, type SearchFilter } from '../model/search'

const { query, filter, schedule, run } = useTrackSearch()

const filters: { label: string, value: SearchFilter }[] = [
  { label: 'Все', value: 'all' },
  { label: 'Треки', value: 'tracks' },
  { label: 'Альбомы', value: 'albums' },
  { label: 'Исполнители', value: 'artists' },
]

// Переход по ссылке /search?q=… — сразу ищем.
const route = useRoute()
onMounted(() => {
  const q = route.query.q
  if (typeof q === 'string' && q && q !== query.value) {
    query.value = q
    run()
  }
})

watch(query, schedule)
</script>

<template>
  <form class="search-bar" role="search" @submit.prevent="run">
    <UiInput v-model="query" type="search" placeholder="Треки, альбомы, исполнители" autofocus clearable>
      <template #icon>
        <Search />
      </template>
    </UiInput>
    <UiSegmented v-model="filter" :options="filters" label="Что искать" />
  </form>
</template>

<style lang="scss" scoped>
.search-bar {
  display: grid;
  gap: var(--space-3);
  max-width: 640px;
}
</style>
