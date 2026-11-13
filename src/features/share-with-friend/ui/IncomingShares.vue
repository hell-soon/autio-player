<script setup lang="ts">
import { Play } from 'lucide-vue-next'
import { FriendAvatar } from '@/entities/friend'
import { usePlayer } from '@/entities/player'
import { useCachedFetch } from '@/shared/lib'
import { UiCover } from '@/shared/ui'

/**
 * «Вам прислали»: треки от друзей с подписью. Тап — играет этот трек, дальше остальные присланные.
 * onlyUnseen — компактный блок на главной (только новое); markSeen — отметить просмотренными (страница «Друзья»).
 */
const props = defineProps<{ onlyUnseen?: boolean, markSeen?: boolean, limit?: number }>()
const p = usePlayer()
const { data: shares } = useCachedFetch<ShareInfo[]>('/api/shares', { key: 'shares:list', ttl: 30_000, default: () => [] })

const list = computed(() => (props.onlyUnseen ? shares.value.filter(s => !s.seen) : shares.value).slice(0, props.limit ?? 30))

onMounted(async () => {
  if (!props.markSeen) return
  // Даём увидеть «новое», потом помечаем прочитанным и убираем значок в меню
  setTimeout(async () => {
    if (!shares.value.some(s => !s.seen)) return
    await $fetch('/api/shares/seen', { method: 'POST' }).catch(() => {})
    refreshNuxtData('shares:unseen')
  }, 2500)
})

function play(i: number) {
  p.playQueue(list.value.map(s => s.track), i)
}

function ago(ts: number) {
  const min = Math.floor((Date.now() - ts) / 60_000)
  if (min < 60) return min < 1 ? 'только что' : `${min} мин назад`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} ч назад`
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}
</script>

<template>
  <section v-if="list.length" class="shares">
    <slot name="title" />
    <ul class="shares__list">
      <li v-for="(s, i) in list" :key="s.id">
        <button type="button" class="share" :class="{ 'is-new': !s.seen }" @click="play(i)">
          <span class="share__art">
            <UiCover :src="s.track.coverUrl" :size="52" rounded="md" />
            <span class="share__play"><Play fill="currentColor" /></span>
          </span>
          <span class="share__body">
            <span class="share__title">{{ s.track.title }}</span>
            <span class="share__artists">{{ s.track.artists.join(', ') }}</span>
            <span class="share__from">
              <FriendAvatar :name="s.from.name" :src="s.from.avatarUrl" :size="18" />
              {{ s.from.name }}<template v-if="s.note">: «{{ s.note }}»</template> · {{ ago(s.createdAt) }}
            </span>
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style lang="scss" scoped>
.shares {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);

  &__list {
    @include glass;

    display: grid;
    gap: 2px;
    padding: var(--space-2);
    border-radius: var(--radius-lg);
    list-style: none;
  }
}

.share {
  @include reset-button;
  @include focus-ring;

  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-width: 0;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  text-align: left;

  @include hover {
    background: var(--c-surface);
  }

  &.is-new {
    background: var(--c-accent-soft);
  }

  &__art {
    position: relative;
    flex: none;
  }

  &__play {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    border-radius: var(--radius-md);
    background: rgb(0 0 0 / 0.35);
    color: #fff;
    opacity: 0;
    transition: opacity var(--dur-fast) var(--ease);

    svg {
      width: 20px;
      height: 20px;
    }
  }

  @include hover {
    .share__play {
      opacity: 1;
    }
  }

  &__body {
    display: grid;
    flex: 1;
    gap: 1px;
    min-width: 0;
  }

  &__title {
    @include truncate;

    font-weight: 600;
  }

  &__artists {
    @include truncate;

    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__from {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    margin-top: 2px;
    color: var(--c-text-subtle);
    font-size: var(--fs-xs);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
</style>
