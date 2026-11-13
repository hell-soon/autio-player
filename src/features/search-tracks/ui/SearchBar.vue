<script setup lang="ts">
import { History, Search } from 'lucide-vue-next'
import { UiInput, UiSegmented } from '@/shared/ui'
import { useTrackSearch, type SearchFilter } from '../model/search'

const { query, filter, schedule, run, recent, suggestions, suggest, remember } = useTrackSearch()

// Подсказки под строкой поиска: сначала подходящие прошлые запросы, потом подсказки Яндекса
const focused = ref(false)
const typed = ref(false)
const hints = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!typed.value || q.length < 2 || filter.value === 'lyrics') return []
  const past = recent.value.filter(r => r.toLowerCase().startsWith(q) && r.toLowerCase() !== q).slice(0, 3).map(text => ({ text, past: true }))
  const fresh = suggestions.value.filter(s => !past.some(p => p.text.toLowerCase() === s.toLowerCase())).slice(0, 6).map(text => ({ text, past: false }))
  return [...past, ...fresh]
})
const showHints = computed(() => focused.value && hints.value.length > 0)

function pick(text: string) {
  query.value = text
  typed.value = false
  run()
  remember(text)
  ;(document.activeElement as HTMLElement | null)?.blur()
}
function onSubmit() {
  typed.value = false
  run()
  remember(query.value)
}
function onFocusOut(e: FocusEvent) {
  // Клик по подсказке внутри формы — не закрываем раньше времени
  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) focused.value = false
}

const filters: { label: string, value: SearchFilter }[] = [
  { label: 'Все', value: 'all' },
  { label: 'Треки', value: 'tracks' },
  { label: 'Альбомы', value: 'albums' },
  { label: 'Исполнители', value: 'artists' },
  { label: 'По тексту', value: 'lyrics' },
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

watch(query, () => {
  schedule()
  if (focused.value) {
    typed.value = true
    suggest()
  }
})
// Переключились на «По тексту» или обратно — результаты другого типа, ищем сразу
watch(filter, (f, prev) => {
  if (f === 'lyrics' || prev === 'lyrics') run()
})
</script>

<template>
  <form class="search-bar" role="search" @submit.prevent="onSubmit" @focusin="focused = true" @focusout="onFocusOut">
    <UiInput v-model="query" type="search" :placeholder="filter === 'lyrics' ? 'Строчка из песни' : 'Треки, альбомы, исполнители'" autofocus clearable>
      <template #icon>
        <Search />
      </template>
    </UiInput>
    <ul v-if="showHints" class="search-bar__hints" role="listbox" aria-label="Подсказки">
      <li v-for="h in hints" :key="h.text">
        <button type="button" class="search-bar__hint" role="option" @mousedown.prevent @click="pick(h.text)">
          <component :is="h.past ? History : Search" class="search-bar__hint-icon" />
          <span>{{ h.text }}</span>
        </button>
      </li>
    </ul>
    <UiSegmented v-model="filter" :options="filters" label="Что искать" />
  </form>
</template>

<style lang="scss" scoped>
.search-bar {
  position: relative;
  display: grid;
  gap: var(--space-3);
  max-width: 640px;

  // Подсказки — поверх фильтров, сразу под строкой ввода
  &__hints {
    @include glass(true);

    position: absolute;
    top: calc(44px + var(--space-1));
    right: 0;
    left: 0;
    z-index: 20;
    display: grid;
    padding: var(--space-1);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    list-style: none;
  }

  &__hint {
    @include reset-button;
    @include focus-ring;

    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    min-height: 40px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-sm);
    text-align: left;

    @include hover {
      background: var(--c-surface);
    }

    span {
      @include truncate;
    }
  }

  &__hint-icon {
    flex: none;
    width: 16px;
    height: 16px;
    color: var(--c-text-subtle);
  }
}
</style>
