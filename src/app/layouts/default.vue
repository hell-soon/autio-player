<script setup lang="ts">
import { HotkeysHelp, useHotkeys } from '@/features/hotkeys'
import { ListenTogetherBar } from '@/features/listen-together'
import { useCoverAccent } from '@/features/switch-theme'
import { useLikes } from '@/entities/library'
import { usePlayer } from '@/entities/player'
import { useMusicServices } from '@/entities/preferences'
import { useSpotifyAccount } from '@/entities/spotify-account'
import { AmbientBackdrop } from '@/widgets/ambient-backdrop'
import { AppSidebar, MobileNav } from '@/widgets/app-navigation'
import { NowPlaying } from '@/widgets/now-playing'
import { OfflineBanner } from '@/widgets/network-status'
import { PlayerBar } from '@/widgets/player-bar'
import { UiToaster } from '@/shared/ui'

const player = usePlayer()
useHotkeys()

/**
 * Прокрутка и появление страниц. Прокручивается не окно, а .shell__main — роутер сам её не трогает:
 * новая страница — с начала, «назад» — на прежнее место.
 * На телефоне (без View Transition) новая страница мягко проявляется — CSS-анимация, ничего не блокирует.
 */
const route = useRoute()
const mainEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)
const scrollByPath = new Map<string, number>()
let goingBack = false
let lastPath = route.fullPath
if (import.meta.client) {
  window.addEventListener('popstate', () => (goingBack = true))
  useRouter().beforeEach((_to, from) => {
    if (mainEl.value) scrollByPath.set(from.fullPath, mainEl.value.scrollTop)
  })
}
watch(() => route.fullPath, (path) => {
  const main = mainEl.value
  // Смена только ?query/#hash на той же странице (поиск, вкладки) — прокрутку не трогаем
  const samePage = path.split(/[?#]/)[0] === lastPath.split(/[?#]/)[0]
  lastPath = path
  if (!main || samePage) {
    goingBack = false
    return
  }
  const saved = goingBack ? scrollByPath.get(path) : undefined
  goingBack = false
  main.scrollTop = saved ?? 0
  // Данные страницы грузятся лениво — дотягиваем прокрутку, когда список появился
  if (saved) setTimeout(() => main.scrollTop < saved && (main.scrollTop = saved), 350)
  const el = contentEl.value
  if (el && !window.matchMedia('(pointer: fine)').matches) {
    el.classList.remove('is-entering')
    void el.offsetWidth // перезапуск анимации
    el.classList.add('is-entering')
  }
}, { flush: 'post' })
// Акцент «Из обложки» (стили на <html> — только в браузере)
if (import.meta.client) useCoverAccent()
const likes = useLikes()
const { data: spotify } = useSpotifyAccount()
const music = useMusicServices()

onMounted(() => {
  likes.load().then(() => likes.syncInBackground())
  // Лайки с других устройств и из приложений Яндекса/Spotify подтягиваем, когда возвращаемся на вкладку.
  let hiddenAt = 0
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now()
    else if (hiddenAt && Date.now() - hiddenAt > 30_000) likes.load(true).then(() => likes.syncInBackground())
  })

  // «Только Яндекс» — всё играет через Яндекс, браузерный плеер Spotify не нужен.
  watch(music.services, s => player.setMusicServices(s), { immediate: true })

  // Как только Spotify подключён, есть Premium и человек им пользуется — поднимаем браузерный плеер Spotify.
  watch(
    () => spotify.value.connected && spotify.value.premium && music.hasSpotify.value,
    (ok) => {
      if (ok) player.connectSpotifyEngine()
    },
    { immediate: true },
  )

  // История прослушивания: пишем трек, когда он реально заиграл.
  let lastLogged = ''
  watch(
    () => [player.current.value?.uid, player.isPlaying.value] as const,
    ([uid, playing]) => {
      const t = player.current.value
      // Пишет только устройство, которое реально играет (не пульт).
      if (!uid || !playing || !t || uid === lastLogged || player.controlling.value) return
      lastLogged = uid
      $fetch('/api/history', { method: 'POST', body: { track: t } })
        .then(() => refreshNuxtData('library:recent'))
        .catch(() => {})
      // Last.fm: «сейчас играет» (сервер молча пропустит, если Last.fm не подключён)
      scrobble = { uid, track: t, startedAt: Date.now(), sent: false }
      $fetch('/api/lastfm/scrobble', { method: 'POST', body: { type: 'now', track: t } }).catch(() => {})
    },
  )

  // Скроббл по правилам Last.fm: трек длиннее 30 с, прослушан наполовину или 4 минуты.
  let scrobble: { uid: string, track: Track, startedAt: number, sent: boolean } | null = null
  watch(player.position, (pos) => {
    const s = scrobble
    if (!s || s.sent || player.controlling.value || player.current.value?.uid !== s.uid) return
    const dur = player.duration.value
    if (dur < 30_000) return
    if (pos >= Math.min(dur / 2, 240_000)) {
      s.sent = true
      $fetch('/api/lastfm/scrobble', { method: 'POST', body: { type: 'scrobble', track: s.track, startedAt: s.startedAt } }).catch(() => {})
    }
  })
})
</script>

<template>
  <div class="shell">
    <AmbientBackdrop />
    <AppSidebar class="shell__rail" />
    <main ref="mainEl" class="shell__main">
      <div ref="contentEl" class="shell__content" @animationend.self="contentEl?.classList.remove('is-entering')">
        <slot />
      </div>
    </main>
    <div class="shell__bottom">
      <ListenTogetherBar class="shell__together" />
      <PlayerBar />
      <MobileNav class="shell__mobile-nav" />
    </div>
    <NowPlaying />
    <OfflineBanner />
    <UiToaster />
    <HotkeysHelp />
  </div>
</template>

<style lang="scss" scoped>
.shell {
  // Приклеен к краям окна. Про iPhone-PWA: статус-бар только непрозрачный (default) — с black-translucent
  // iOS 26 даёт окно короче экрана, и снизу остаётся полоса, которую ничем не закрасить (WebKit bug 301108).
  position: fixed;
  inset: 0;
  display: grid;
  grid-template:
    'rail main' 1fr
    'rail bottom' auto / var(--sidebar-width) 1fr;
  gap: var(--space-3);
  padding: var(--space-3);

  @include down(md) {
    grid-template:
      'main' 1fr
      'bottom' auto / 1fr;
    gap: 0;
    padding: 0;
  }

  // Над эмбиент-фоном (он fixed, z-index 0).
  &__rail,
  &__main,
  &__bottom {
    position: relative;
    z-index: 1;
  }

  &__rail {
    grid-area: rail;

    @include down(md) {
      display: none;
    }
  }

  &__main {
    grid-area: main;
    min-width: 0;
    overflow-y: auto;
    // Страховка: ничто внутри не должно давать «боковой слайдер» всей страницы (особенно в PWA на iPhone)
    overflow-x: hidden;
    overscroll-behavior: contain;
    // При переходе между страницами двигается только эта область (shared/styles/_motion.scss)
    view-transition-name: page;
    border-radius: var(--radius-lg);
    scrollbar-width: thin;
    scrollbar-color: var(--c-surface-active) transparent;
  }

  // Контент тянется на всю ширину (сетки сами добавляют колонки), ограничение — только на очень широких экранах.
  &__content {
    // Телефон: новая страница мягко проявляется (см. watch в script)
    &.is-entering {
      animation: page-enter 0.26s cubic-bezier(0.2, 0, 0, 1);
    }

    max-width: 1800px;
    margin: 0 auto;
    padding: var(--space-6) var(--space-5) var(--space-7);

    @include down(md) {
      padding: var(--space-5) var(--space-4) var(--space-6);
      padding-top: calc(var(--space-5) + env(safe-area-inset-top));
    }
  }

  &__bottom {
    grid-area: bottom;
    z-index: var(--z-player);

    @include down(md) {
      display: grid;
      gap: var(--space-2);
      padding-top: var(--space-2);
      // мини-плеер «парит» над нижней навигацией с отступами (не :first-child — сверху бывает плашка «Слушаете вместе»)
      > .player {
        margin: 0 var(--space-2);
      }
    }
  }

  &__together {
    justify-self: center;
    max-width: min(100% - var(--space-4), 460px);
    margin-bottom: var(--space-2);
  }

  &__mobile-nav {
    @include up(md) {
      display: none;
    }
  }
}

@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}
</style>
