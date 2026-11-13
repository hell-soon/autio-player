<script setup lang="ts">
import { Lock, Play } from 'lucide-vue-next'
import { ListenTogetherButton } from '@/features/listen-together'
import { FriendAvatar, lastSeenLabel } from '@/entities/friend'
import { LikedCover, PlaylistCard } from '@/entities/library'
import { usePlayer } from '@/entities/player'
import { TrackList } from '@/widgets/track-list'
import { plural, useCachedFetch } from '@/shared/lib'
import { UiButton, UiCover, UiEmptyState, UiSkeleton, UiSkeletonRows } from '@/shared/ui'

/** Профиль друга: сейчас играет, недавнее, топ исполнителей, плейлисты и любимые (с учётом его приватности). */
const props = defineProps<{ id: string }>()
const p = usePlayer()
const { data, status, error, refresh } = useCachedFetch<FriendProfile>(() => `/api/friends/${props.id}`, { key: `friend:${props.id}`, ttl: 20_000 })
useHead({ title: () => data.value?.name ?? 'Друг' })

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    if (!document.hidden) refresh()
  }, 15_000)
})
onBeforeUnmount(() => clearInterval(timer))

// Совпадение вкусов — отдельным запросом (считается по истории и лайкам обоих)
const { data: match } = useCachedFetch<TasteMatch>(() => `/api/friends/${props.id}/match`, { key: `friend-match:${props.id}`, ttl: 10 * 60_000 })

const count = (n: number) => `${n} ${plural(n, ['трек', 'трека', 'треков'])}`
const np = computed(() => data.value?.nowPlaying ?? null)
</script>

<template>
  <div v-if="status === 'pending' && !data" class="page-skeleton">
    <div class="page-skeleton__head">
      <UiSkeleton width="112px" height="112px" circle />
      <div class="page-skeleton__lines">
        <UiSkeleton width="min(320px, 60vw)" height="36px" radius="var(--radius-md)" />
        <UiSkeleton width="140px" height="14px" />
      </div>
    </div>
    <UiSkeletonRows :count="6" />
  </div>
  <UiEmptyState v-else-if="error || !data" title="Друг не найден">
    <UiButton to="/friends">
      Ко всем друзьям
    </UiButton>
  </UiEmptyState>

  <div v-else class="friend">
    <header class="friend__header">
      <FriendAvatar :name="data.name" :src="data.avatarUrl" :size="112" :live="!!np?.isPlaying" />
      <div class="friend__info">
        <h1 class="friend__name">
          {{ data.name }}
        </h1>
        <p class="friend__status">
          {{ lastSeenLabel(data) }}
        </p>
      </div>
    </header>

    <!-- Сейчас играет -->
    <section v-if="np" class="friend__now">
      <UiCover :src="np.track.coverUrl" :size="64" rounded="md" />
      <div class="friend__now-text">
        <span class="friend__now-label">{{ np.isPlaying ? 'Слушает сейчас' : 'На паузе' }}</span>
        <span class="friend__now-title">{{ np.track.title }}</span>
        <span class="friend__now-artists">{{ np.track.artists.join(', ') }}</span>
      </div>
      <div class="friend__now-actions">
        <ListenTogetherButton :friend="data" :now-playing="np" />
        <UiButton variant="ghost" @click="p.playQueue([np.track], 0)">
          <template #icon>
            <Play />
          </template>
          Включить себе
        </UiButton>
      </div>
    </section>

    <!-- Совпадение вкусов -->
    <section v-if="match && match.enoughData" class="match">
      <div class="match__ring" :style="{ '--p': match.percent }" role="img" :aria-label="`Совпадение вкусов ${match.percent}%`">
        <span>{{ match.percent }}%</span>
      </div>
      <div class="match__body">
        <h2 class="match__title">
          Совпадение вкусов
        </h2>
        <p v-if="match.commonArtists.length" class="match__artists">
          Общее: {{ match.commonArtists.slice(0, 6).join(', ') }}
        </p>
        <p v-else class="match__artists">
          Общих исполнителей пока нет — самое время обменяться треками
        </p>
        <UiButton v-if="match.commonTrackCount" :to="`/collection/taste:${data.id}`" size="sm">
          Общее у нас · {{ count(match.commonTrackCount) }}
        </UiButton>
      </div>
    </section>

    <section class="friend__section">
      <h2 class="friend__heading">
        Плейлисты
      </h2>
      <div class="friend__grid">
        <PlaylistCard :to="`/collection/friend-liked:${data.id}`" title="Любимые треки" :subtitle="count(data.likedCount)">
          <template #cover>
            <LikedCover />
          </template>
        </PlaylistCard>
        <PlaylistCard
          v-for="pl in data.playlists"
          :key="pl.id"
          :to="`/collection/friend:${data.id}:${pl.id}`"
          :title="pl.name"
          :subtitle="count(pl.count)"
          :covers="pl.covers"
        />
      </div>
    </section>

    <p v-if="data.historyHidden" class="friend__private">
      <Lock /> История прослушиваний скрыта
    </p>
    <template v-else>
      <section v-if="data.topArtists.length" class="friend__section">
        <h2 class="friend__heading">
          Топ исполнителей за месяц
        </h2>
        <ol class="friend__artists">
          <li v-for="(a, i) in data.topArtists" :key="a.name">
            <NuxtLink :to="a.artistId ? `/artist/${a.source}:${a.artistId}` : `/artist/name:${encodeURIComponent(a.name)}`" class="artist-chip">
              <span class="artist-chip__num">{{ i + 1 }}</span>
              <UiCover :src="a.coverUrl" :size="32" rounded="full" />
              <span class="artist-chip__name">{{ a.name }}</span>
            </NuxtLink>
          </li>
        </ol>
      </section>
      <section v-if="data.recent.length" class="friend__section">
        <h2 class="friend__heading">
          Недавно играло
        </h2>
        <div class="friend__panel">
          <TrackList :tracks="data.recent" :numbered="false" :show-album="false" />
        </div>
      </section>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.loading {
  display: grid;
  place-items: center;
  padding: var(--space-7);
  font-size: 24px;
}

.friend {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-6);

  &__header {
    display: flex;
    align-items: center;
    gap: var(--space-5);

    @include down(md) {
      flex-direction: column;
      text-align: center;
    }
  }

  &__info {
    min-width: 0;
  }

  &__name {
    font-size: clamp(1.75rem, 4vw, 3rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.05;
    overflow-wrap: anywhere;
  }

  &__status {
    margin-top: var(--space-1);
    color: var(--c-text-muted);
  }

  &__now {
    @include glass;

    display: flex;
    align-items: center;
    gap: var(--space-4);
    min-width: 0;
    padding: var(--space-4);
    border-radius: var(--radius-lg);

    @include down(md) {
      flex-wrap: wrap;
    }
  }

  &__now-text {
    display: grid;
    flex: 1;
    min-width: 0;
  }

  &__now-label {
    color: var(--c-accent);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  &__now-title {
    @include truncate;

    font-size: var(--fs-lg);
    font-weight: 700;
  }

  &__now-artists {
    @include truncate;

    color: var(--c-text-muted);
  }

  &__now-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);

    @include down(md) {
      width: 100%;
    }
  }

  &__section {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-3);
  }

  &__heading {
    font-size: var(--fs-xl);
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
    gap: var(--space-2);

    @include down(sm) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  &__panel {
    @include glass;

    padding: var(--space-2);
    border-radius: var(--radius-lg);
  }

  &__artists {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    list-style: none;
  }

  &__private {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--c-text-muted);

    svg {
      width: 18px;
      height: 18px;
    }
  }
}

.artist-chip {
  @include focus-ring;

  display: flex;
  align-items: center;
  gap: var(--space-2);
  max-width: 260px;
  padding: 4px var(--space-3) 4px 4px;
  border-radius: var(--radius-full);
  background: var(--c-surface);

  @include hover {
    background: var(--c-surface-hover);
  }

  &__num {
    display: grid;
    place-items: center;
    width: 24px;
    color: var(--c-text-subtle);
    font-size: var(--fs-xs);
    font-weight: 700;
  }

  &__name {
    @include truncate;

    font-weight: 600;
  }
}

// Заглушка на время загрузки — повторяет раскладку страницы, чтобы ничего не «прыгало»
.page-skeleton {
  display: grid;
  gap: var(--space-5);

  &__head {
    display: flex;
    align-items: center;
    gap: var(--space-5);
  }

  &__lines {
    display: grid;
    gap: var(--space-2);
  }
}

.match {
  @include glass;

  display: flex;
  align-items: center;
  gap: var(--space-5);
  min-width: 0;
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-lg);

  // Кольцо-процент: conic-gradient по --p (0–100)
  &__ring {
    display: grid;
    flex: none;
    place-items: center;
    width: 88px;
    height: 88px;
    border-radius: 50%;
    background: conic-gradient(var(--c-accent) calc(var(--p) * 1%), var(--c-surface) 0);

    span {
      display: grid;
      place-items: center;
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: var(--c-bg-elevated);
      font-size: var(--fs-lg);
      font-weight: 800;
    }
  }

  &__body {
    display: grid;
    justify-items: start;
    gap: var(--space-2);
    min-width: 0;
  }

  &__title {
    font-size: var(--fs-lg);
    font-weight: 700;
  }

  &__artists {
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }
}
</style>
