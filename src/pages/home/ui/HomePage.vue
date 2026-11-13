<script setup lang="ts">
import { Compass, RefreshCw, Settings, Sparkles } from 'lucide-vue-next'
import { ArtistRadioRow, StationChips, WaveCard } from '@/features/start-wave'
import { LikedCover, PlaylistCard, PlaylistCover, useLikes, usePlaylists } from '@/entities/library'
import { useMusicServices } from '@/entities/preferences'
import { TrackList } from '@/widgets/track-list'
import { TrackShelf } from '@/widgets/track-shelf'
import { heroCover, plural, useCachedFetch } from '@/shared/lib'
import { UiButton, UiCover, UiIconButton } from '@/shared/ui'

const { user } = useUserSession()
const { data: playlists } = usePlaylists()
const likes = useLikes()
// «Только Spotify»: подбор музыки (волна, станции) работает через Яндекс — такие блоки не показываем
const music = useMusicServices()

// Подборки кэшируются (на сервере 10 мин, на клиенте 10 мин) — переходы по вкладкам мгновенные.
const { data: feed, status } = useCachedFetch<HomeFeed>('/api/home', { key: 'home:feed', ttl: 10 * 60_000 })
const f = computed(() => feed.value)

const refreshing = ref(false)
async function refreshFeed() {
  refreshing.value = true
  try {
    feed.value = await $fetch<HomeFeed>('/api/home', { query: { fresh: 1 } })
  }
  finally {
    refreshing.value = false
  }
}

// «Похоже на …» — от последнего трека.
const seed = computed(() => f.value?.recent[0])
const { data: similar } = useAsyncData(
  'home:similar',
  () => (f.value?.connections.yandex && seed.value
    ? $fetch<Track[]>('/api/radio', { method: 'POST', body: { station: 'similar', seed: seed.value } })
    : Promise.resolve([] as Track[])),
  { default: () => [] as Track[], watch: [() => seed.value?.uid], lazy: true, server: false },
)

const greeting = computed(() => {
  const h = new Date().getHours()
  const g = h < 6 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер'
  const name = user.value?.name?.split(' ')[0]
  return name ? `${g}, ${name}` : g
})

const count = (n: number) => `${n} ${plural(n, ['трек', 'трека', 'треков'])}`
const spotifyOwn = computed(() => f.value?.spotifyPlaylists.filter(p => p.owned) ?? [])
const loading = computed(() => status.value === 'pending' && !f.value)

// «Открытия недели» подбираются через Яндекс — без него карточку не показываем.
const mixes = computed(() => (f.value?.mixes ?? []).filter(m => m.kind === 'daily' || f.value?.connections.yandex))
const mixIcon = { daily: Sparkles, discover: Compass }
const showOwn = computed(() => !(f.value?.personal.length || mixes.value.length))
const showMore = ref(false)
</script>

<template>
  <div class="home">
    <header class="home__head">
      <h1 class="home__greeting">
        {{ greeting }}
      </h1>
      <UiIconButton label="Обновить подборки" variant="filled" size="sm" :disabled="refreshing" @click="refreshFeed">
        <RefreshCw :class="{ spin: refreshing }" />
      </UiIconButton>
    </header>

    <!-- Без Яндекса волны нет — вместо неактивной карточки ниже один понятный блок «Подключите» -->
    <WaveCard v-if="music.hasYandex.value && (!f || f.connections.yandex)" :disabled="!f" />
    <!-- Станции — та же «волна», только по жанру/настроению: сразу под ней, без отдельного заголовка -->
    <StationChips v-if="f?.stations.length" :stations="f.stations" class="home__stations" />

    <!-- Собрано для вас: персональные плейлисты Яндекса + любимое + свои плейлисты -->
    <section class="home__section">
      <h2 class="home__heading">
        Собрано для вас
        <NuxtLink to="/library" class="home__more-link">Библиотека →</NuxtLink>
      </h2>
      <div class="home__cards">
        <NuxtLink v-for="m in mixes" :key="m.kind" :to="`/collection/mix:${m.kind}`" class="mix" @click="heroCover" :class="`mix--${m.kind}`">
          <span class="mix__art">
            <PlaylistCover v-if="m.covers.length" :covers="m.covers" :size="400" class="mix__cover" />
            <span v-else class="mix__cover mix__cover--blank" />
            <span class="mix__badge" :aria-label="m.title"><component :is="mixIcon[m.kind]" /></span>
          </span>
          <span class="mix__title">{{ m.title }}</span>
          <span class="mix__desc">{{ m.count ? `${count(m.count)} · ${m.description}` : m.description }}</span>
        </NuxtLink>
        <NuxtLink v-for="p in f?.personal ?? []" :key="p.id" :to="`/collection/${p.id}`" class="mix" @click="heroCover">
          <UiCover :src="p.coverUrl" :size="400" rounded="md" class="mix__cover" />
          <span class="mix__title">{{ p.title }}</span>
          <span v-if="p.description" class="mix__desc">{{ p.description }}</span>
        </NuxtLink>
        <template v-if="loading">
          <span v-for="i in 4" :key="i" class="mix mix--skeleton"><span class="mix__cover" /></span>
        </template>
        <PlaylistCard to="/liked" title="Любимые треки" :subtitle="count(likes.ids.value.length)">
          <template #cover>
            <LikedCover />
          </template>
        </PlaylistCard>
        <PlaylistCard v-if="f?.connections.spotify" to="/collection/spotify:saved" title="Любимое в Spotify" subtitle="Сохранённые треки">
          <template #cover>
            <LikedCover />
          </template>
        </PlaylistCard>
        <!-- Свои плейлисты живут в библиотеке; на главной — только если подборок нет (например, только Spotify) -->
        <PlaylistCard
          v-for="p in showOwn ? playlists : []"
          :key="p.id"
          :to="`/playlist/${p.id}`"
          :title="p.name"
          :subtitle="count(p.count)"
          :covers="p.covers"
        />
        <PlaylistCard
          v-for="p in showOwn ? spotifyOwn : []"
          :key="p.id"
          :to="`/collection/${p.id}`"
          :title="p.title"
          :subtitle="p.count !== undefined ? `Spotify · ${count(p.count)}` : 'Spotify'"
          :covers="p.coverUrl ? [p.coverUrl] : []"
        />
      </div>
    </section>

    <section v-if="f && !f.connections.yandex && music.hasYandex.value" class="home__hint">
      <div>
        <h2>Подключите Яндекс Музыку</h2>
        <p>Откроет «Мою волну», «Плейлист дня», станции и подборки «Похоже на…».</p>
      </div>
      <UiButton to="/settings" variant="primary">
        <template #icon>
          <Settings />
        </template>
        Подключить
      </UiButton>
    </section>

    <section v-if="f?.spotifyNeedsReconnect" class="home__hint">
      <div>
        <h2>Переподключите Spotify</h2>
        <p>Нужны разрешения на топ, исполнителей и недавнее.</p>
      </div>
      <UiButton to="/api/auth/spotify/login" external variant="primary">
        Переподключить
      </UiButton>
    </section>

    <div v-if="f?.recent.length || f?.spotifyTop.length" class="home__pair" :class="{ 'is-single': !(f.recent.length && f.spotifyTop.length) }">
      <section v-if="f.recent.length" class="home__section">
        <h2 class="home__heading">
          Недавно слушали
        </h2>
        <div class="home__panel">
          <TrackList :tracks="f.recent.slice(0, 6)" :numbered="false" :show-album="false" :columns="f.spotifyTop.length ? undefined : 2" />
        </div>
      </section>
      <section v-if="f.spotifyTop.length" class="home__section">
        <h2 class="home__heading">
          Ваш топ за месяц
        </h2>
        <div class="home__panel">
          <TrackList :tracks="f.spotifyTop.slice(0, 6)" :show-album="false" :columns="f.recent.length ? undefined : 2" />
        </div>
      </section>
    </div>

    <TrackShelf
      v-if="similar.length && seed"
      :title="`Похоже на «${seed.title}»`"
      :subtitle="seed.artists.join(', ')"
      :tracks="similar"
    />

    <!-- Остальное — по запросу: главная не превращается в бесконечную ленту -->
    <template v-if="showMore">
      <section v-if="f?.spotifyArtists.length" class="home__section">
        <h2 class="home__heading">
          Ваши исполнители
          <small>нажмите — включится радио</small>
        </h2>
        <ArtistRadioRow :artists="f.spotifyArtists" />
      </section>

      <section v-if="f?.chart.length" class="home__section">
        <h2 class="home__heading">
          Чарт
        </h2>
        <div class="home__panel">
          <TrackList :tracks="f.chart.slice(0, 15)" :show-album="false" :columns="3" />
        </div>
      </section>
    </template>
    <UiButton v-else-if="f?.spotifyArtists.length || f?.chart.length" variant="ghost" class="home__show-more" @click="showMore = true">
      Показать ещё: {{ [f?.spotifyArtists.length && 'ваши исполнители', f?.chart.length && 'чарт'].filter(Boolean).join(' и ') }}
    </UiButton>
  </div>
</template>

<style lang="scss" scoped>
.home {
  display: grid;
  // minmax(0, …): иначе горизонтальная лента карточек растягивает колонку, и на iPhone вся главная листается вбок
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-6);

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    margin-bottom: calc(var(--space-2) * -1);
  }

  &__greeting {
    font-size: var(--fs-2xl);
    font-weight: 800;
    letter-spacing: -0.02em;

    @include down(md) {
      font-size: var(--fs-xl);
    }
  }

  &__section {
    display: grid;
    align-content: start;
    gap: var(--space-3);
    min-width: 0;
  }

  &__more-link {
    margin-left: auto;
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
    font-weight: 600;
    letter-spacing: 0;

    @include hover {
      color: var(--c-text);
    }
  }

  &__stations {
    margin-top: calc(var(--space-3) - var(--space-6));
  }

  &__show-more {
    justify-self: center;
  }

  &__heading {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    font-size: var(--fs-xl);
    font-weight: 700;
    letter-spacing: -0.02em;

    small {
      color: var(--c-text-subtle);
      font-size: var(--fs-sm);
      font-weight: 500;
      letter-spacing: 0;
    }
  }

  // Одна строка карточек на широком экране; на телефоне — горизонтальная прокрутка.
  &__cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(176px, 1fr));
    gap: var(--space-1);
    margin: 0 calc(var(--space-2) * -1);

    @include down(md) {
      grid-template-columns: none;
      grid-auto-flow: column;
      grid-auto-columns: 42%;
      margin: 0 calc(var(--space-4) * -1);
      padding: 0 var(--space-2);
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;

      > * {
        scroll-snap-align: start;
      }
    }
  }

  &__hint {
    @include glass;

    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-lg);

    h2 {
      font-size: var(--fs-lg);
    }

    p {
      color: var(--c-text-muted);
      font-size: var(--fs-sm);
    }

    @include down(sm) {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  &__pair {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-4);

    &.is-single {
      grid-template-columns: minmax(0, 1fr);
    }

    @include down(lg) {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  &__panel {
    @include glass;

    padding: var(--space-2);
    border-radius: var(--radius-lg);
  }
}

// Карточка персонального плейлиста (обложка уже содержит название — подпись под ней).
.mix {
  @include focus-ring;

  // Обложка собранного сайтом микса: коллаж + плашка с названием поверх
  &__art {
    position: relative;
    display: block;
  }

  &__cover--blank {
    display: block;
    border-radius: var(--radius-md);
    background:
      radial-gradient(circle at 25% 20%, var(--c-accent) 0, transparent 60%),
      linear-gradient(160deg, var(--c-accent-soft), var(--c-surface));
  }

  &--discover &__cover--blank {
    background:
      radial-gradient(circle at 80% 85%, var(--c-accent) 0, transparent 55%),
      linear-gradient(20deg, var(--c-surface), var(--c-accent-soft));
  }

  &__badge {
    position: absolute;
    left: var(--space-2);
    bottom: calc(var(--space-2) * 2);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: calc(100% - var(--space-4));
    padding: 8px;
    border-radius: var(--radius-full);
    background: var(--c-panel-strong);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    font-size: var(--fs-sm);
    font-weight: 700;
    white-space: nowrap;

    svg {
      flex: none;
      width: 16px;
      height: 16px;
      color: var(--c-accent);
    }
  }

  display: grid;
  gap: 2px;
  min-width: 0;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  transition: background-color var(--dur-fast) var(--ease);

  @include hover {
    background: var(--c-surface);
  }

  &__cover {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 1;
    margin-bottom: var(--space-2);
    box-shadow: 0 10px 28px rgb(0 0 0 / 0.22);
  }

  &__title {
    @include truncate;

    font-weight: 600;
  }

  &__desc {
    display: -webkit-box;
    overflow: hidden;
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
    line-height: 1.35;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  &--skeleton &__cover {
    display: block;
    border-radius: var(--radius-md);
    background: var(--c-surface);
    animation: pulse 1.2s ease-in-out infinite alternate;
  }
}


@keyframes pulse {
  to {
    opacity: 0.5;
  }
}
</style>
