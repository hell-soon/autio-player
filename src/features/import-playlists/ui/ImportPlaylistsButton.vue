<script setup lang="ts">
import { Check, ListPlus } from 'lucide-vue-next'
import { refreshPlaylists } from '@/entities/library'
import { useMusicServices } from '@/entities/preferences'
import { plural } from '@/shared/lib'
import { UiButton, UiCover, UiDialog, UiSpinner, useToast } from '@/shared/ui'

/** Диалог: выбрать свои плейлисты из Spotify и Яндекса и скопировать их в библиотеку сайта. */
const toast = useToast()
const open = ref(false)
const loading = ref(false)
const importing = ref(false)
const list = ref<ExternalPlaylist[]>([])
const errors = ref<string[]>([])
const connected = ref(true)
const selected = ref(new Set<string>())

const music = useMusicServices()
// Названия только тех сервисов, которыми человек пользуется
const serviceNames = computed(() => [music.hasSpotify.value && 'Spotify', music.hasYandex.value && 'Яндекс Музыке'].filter(Boolean).join(' и '))
const tracks = (n: number) => `${n} ${plural(n, ['трек', 'трека', 'треков'])}`
const groups = computed(() => [
  { source: 'spotify', title: 'Spotify', items: list.value.filter(p => p.source === 'spotify') },
  { source: 'yandex', title: 'Яндекс Музыка', items: list.value.filter(p => p.source === 'yandex') },
].filter(g => g.items.length))

async function show() {
  open.value = true
  selected.value = new Set()
  loading.value = true
  try {
    const r = await $fetch<{ playlists: ExternalPlaylist[], errors: string[], connected: boolean }>('/api/transfer/playlists')
    list.value = r.playlists
    errors.value = r.errors
    connected.value = r.connected
  }
  catch {
    toast.error('Не удалось загрузить плейлисты')
    open.value = false
  }
  finally {
    loading.value = false
  }
}

function toggle(id: string) {
  const s = new Set(selected.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selected.value = s
}

async function run() {
  importing.value = true
  try {
    const r = await $fetch<ImportPlaylistsResult>('/api/transfer/import', { method: 'POST', body: { ids: [...selected.value] } })
    const n = r.imported.length
    if (n) toast.show(`Импортировано ${n} ${plural(n, ['плейлист', 'плейлиста', 'плейлистов'])}`)
    if (r.errors.length) toast.error(`Не удалось импортировать: ${r.errors.length}`)
    refreshPlaylists()
    open.value = false
  }
  catch {
    toast.error('Не удалось импортировать')
  }
  finally {
    importing.value = false
  }
}
</script>

<template>
  <UiButton @click="show">
    <template #icon>
      <ListPlus />
    </template>
    Импорт плейлистов
  </UiButton>

  <UiDialog v-model:open="open" title="Импорт плейлистов">
    <div v-if="loading" class="import__loading">
      <UiSpinner />
    </div>
    <template v-else>
      <template v-if="!connected">
        <p class="import__empty">
          Подключите {{ music.services.value === 'both' ? 'Spotify или Яндекс Музыку' : music.hasSpotify.value ? 'Spotify' : 'Яндекс Музыку' }} в настройках — и плейлисты можно будет скопировать сюда.
        </p>
        <UiButton to="/settings" variant="primary" block @click="open = false">
          Открыть настройки
        </UiButton>
      </template>
      <p v-else-if="!list.length" class="import__empty">
        {{ errors.length ? `Не удалось получить плейлисты: ${errors.join(', ')}` : `Своих плейлистов в ${serviceNames} не нашлось` }}
      </p>
      <p v-else class="import__hint">
        Плейлисты скопируются в библиотеку сайта. Оригиналы в сервисах не изменятся.
      </p>
      <div v-for="g in groups" :key="g.source" class="import__group">
        <h3 class="import__source">
          {{ g.title }}
        </h3>
        <button
          v-for="p in g.items"
          :key="p.id"
          type="button"
          class="import__item"
          :class="{ 'is-on': selected.has(p.id) }"
          :aria-pressed="selected.has(p.id)"
          @click="toggle(p.id)"
        >
          <UiCover :src="p.coverUrl" :size="44" rounded="sm" />
          <span class="import__text">
            <span class="import__title">{{ p.title }}</span>
            <span v-if="p.count !== undefined" class="import__count">{{ tracks(p.count) }}</span>
          </span>
          <span class="import__check"><Check /></span>
        </button>
      </div>
      <UiButton v-if="list.length" variant="primary" block :loading="importing" :disabled="!selected.size" @click="run">
        {{ selected.size ? `Импортировать (${selected.size})` : 'Выберите плейлисты' }}
      </UiButton>
    </template>
  </UiDialog>
</template>

<style lang="scss" scoped>
.import {
  &__loading {
    display: grid;
    place-items: center;
    padding: var(--space-6);
    font-size: 24px;
  }

  &__hint,
  &__empty {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__group {
    display: grid;
    gap: 2px;
  }

  &__source {
    margin-bottom: var(--space-1);
    color: var(--c-text-muted);
    font-size: var(--fs-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  &__item {
    @include reset-button;
    @include focus-ring;

    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
    padding: var(--space-2);
    border-radius: var(--radius-md);
    text-align: left;
    transition: background-color var(--dur-fast) var(--ease);

    @include hover {
      background: var(--c-surface);
    }

    &.is-on {
      background: var(--c-accent-soft);
    }
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

  &__count {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__check {
    display: grid;
    flex: none;
    place-items: center;
    width: 24px;
    height: 24px;
    border: 2px solid var(--c-glass-border);
    border-radius: 50%;
    color: transparent;

    svg {
      width: 14px;
      height: 14px;
    }
  }

  &__item.is-on &__check {
    border-color: var(--c-accent);
    background: var(--c-accent);
    color: var(--c-bg);
  }
}
</style>
