<script setup lang="ts">
import { plural } from '@/shared/lib'
import { UiButton, UiDialog, UiSpinner } from '@/shared/ui'

/** Ход и итог экспорта плейлиста сайта в Spotify / Яндекс Музыку. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ playlistId: string, to: TrackSource | null }>()

const SERVICE = { spotify: 'Spotify', yandex: 'Яндекс Музыку' } as const
const state = ref<'idle' | 'running' | 'done' | 'error'>('idle')
const result = ref<ExportPlaylistResult | null>(null)
const message = ref('')

watch(open, async (o) => {
  if (!o || !props.to) return
  state.value = 'running'
  result.value = null
  try {
    result.value = await $fetch<ExportPlaylistResult>(`/api/playlists/${props.playlistId}/export`, { method: 'POST', body: { to: props.to } })
    state.value = 'done'
  }
  catch (e: any) {
    message.value = e?.data?.message ?? 'Не удалось экспортировать'
    state.value = 'error'
  }
})

const tracks = (n: number) => `${n} ${plural(n, ['трек', 'трека', 'треков'])}`
</script>

<template>
  <UiDialog v-model:open="open" :title="to ? `Экспорт в ${SERVICE[to]}` : 'Экспорт'">
    <div v-if="state === 'running'" class="export__running">
      <UiSpinner />
      <p>Ищем треки и создаём плейлист… Большие плейлисты — до минуты.</p>
    </div>

    <template v-else-if="state === 'done' && result">
      <p>
        Готово: в новый плейлист добавлено {{ tracks(result.added) }}.
      </p>
      <details v-if="result.missing.length" class="export__missing">
        <summary>Не нашлось: {{ tracks(result.missing.length) }}</summary>
        <ul>
          <li v-for="(m, i) in result.missing" :key="i">
            {{ m.artists.join(', ') }} — {{ m.title }}
          </li>
        </ul>
      </details>
      <UiButton :to="`/collection/${result.id}`" variant="primary" block @click="open = false">
        Открыть плейлист
      </UiButton>
    </template>

    <template v-else-if="state === 'error'">
      <p class="export__error">
        {{ message }}
      </p>
      <UiButton v-if="message.includes('переподключить')" to="/api/auth/spotify/login" external variant="primary" block>
        Переподключить Spotify
      </UiButton>
    </template>
  </UiDialog>
</template>

<style lang="scss" scoped>
.export {
  &__running {
    display: grid;
    justify-items: center;
    gap: var(--space-3);
    padding: var(--space-4) 0;
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
    text-align: center;

    :deep(.ui-spinner) {
      font-size: 24px;
    }
  }

  &__missing {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);

    summary {
      cursor: pointer;
    }

    ul {
      display: grid;
      gap: 2px;
      max-height: 180px;
      margin-top: var(--space-2);
      padding-left: var(--space-4);
      overflow-y: auto;
    }
  }

  &__error {
    color: var(--c-danger);
  }
}
</style>
