<script setup lang="ts">
import { Download, Heart, Layers, MicVocal, MonitorSmartphone, Radio, SkipForward, Users } from 'lucide-vue-next'
import { SpotifyLoginButton } from '@/features/auth-by-spotify'
import { YandexDeviceLogin } from '@/features/auth-by-yandex'
import { UiInput, UiLogo } from '@/shared/ui'

/**
 * Приветствие и вход: живой фон, что это за приложение (превью плеера + возможности), вход через Яндекс / Spotify.
 * Всё оформление декоративное и лёгкое (только transform/opacity), логика входа — в features/auth-by-*.
 */
const route = useRoute()
const { fetch: refreshSession } = useUserSession()
const { data: config } = useFetch('/api/auth/config')

// Ссылка-приглашение: /login?invite=КОД — код подставляется сам.
const invite = ref(String(route.query.invite ?? ''))
const showInvite = ref(!!invite.value)

async function onYandexDone() {
  await refreshSession()
  await navigateTo('/')
}

const FEATURES = [
  { icon: Layers, title: 'Яндекс и Spotify вместе', text: 'Общая библиотека и поиск. Лайки сами синхронизируются с сервисами.' },
  { icon: Radio, title: 'Волна и подборки', text: '«Моя волна», радио, «Микс дня», «Открытия недели» и новинки любимых исполнителей.' },
  { icon: MonitorSmartphone, title: 'На всех устройствах', text: 'Начали на компьютере — продолжите с телефона с того же места. Телефон — пульт.' },
  { icon: MicVocal, title: 'Тексты и караоке', text: 'Синхронный текст, полноэкранный режим и поиск песни по строчке.' },
  { icon: Users, title: 'С друзьями', text: 'Что сейчас слушают друзья, «Слушать вместе» и совпадение вкусов.' },
  { icon: Download, title: 'Как приложение', text: 'Ставится на экран «Домой», управляется с экрана блокировки.' },
]

// «Волна» внизу фона: высоты полосок — плавная синусоида с шумом (одинаково на сервере и в браузере)
const WAVE = Array.from({ length: 48 }, (_, i) => 0.25 + 0.55 * Math.abs(Math.sin(i * 0.42)) * (0.6 + 0.4 * Math.abs(Math.sin(i * 1.7))))

// Подсказка про установку — только в браузере и если сайт ещё не установлен
const installHint = ref('')
onMounted(() => {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone
  if (standalone) return
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) installHint.value = 'На iPhone: «Поделиться» → «На экран «Домой»» — и Audio откроется как приложение.'
  else if (/Android/.test(ua)) installHint.value = 'На Android: меню браузера → «Установить приложение».'
})
</script>

<template>
  <main class="welcome">
    <!-- Живой фон: плывущие пятна цвета и «волна» -->
    <div class="welcome__bg" aria-hidden="true">
      <span class="welcome__blob is-a" />
      <span class="welcome__blob is-b" />
      <span class="welcome__blob is-c" />
      <div class="welcome__wave">
        <i v-for="(h, i) in WAVE" :key="i" :style="{ '--h': h, '--i': i }" />
      </div>
    </div>

    <div class="welcome__inner">
      <section class="hero" style="--i: 0">
        <UiLogo :size="72" class="hero__logo" />
        <h1 class="hero__title">
          Вся ваша музыка —<br><span class="hero__accent">в одном плеере</span>
        </h1>
        <p class="hero__lead">
          Audio объединяет Яндекс Музыку и Spotify: одна библиотека, одна очередь, одно «Сейчас играет» на всех устройствах.
        </p>
      </section>

      <!-- Вход -->
      <section class="auth" style="--i: 1" aria-labelledby="auth-title">
        <h2 id="auth-title" class="auth__title">
          Войти
        </h2>
        <p class="auth__sub">
          Через сервис, которым вы пользуетесь. Второй можно подключить потом.
        </p>

        <p v-if="config?.firstUser" class="auth__note">
          Вы первый — станете владельцем сайта.
        </p>

        <YandexDeviceLogin :invite="invite" @done="onYandexDone" />
        <SpotifyLoginButton v-if="config?.spotifyEnabled" :invite="invite" />

        <template v-if="config?.inviteRequired">
          <button v-if="!showInvite" type="button" class="auth__link" @click="showInvite = true">
            Первый раз здесь? Введите код приглашения
          </button>
          <UiInput v-else v-model="invite" placeholder="Код приглашения" autofocus />
        </template>

        <p v-if="route.query.error" class="auth__error" role="alert">
          {{ route.query.error }}
        </p>
      </section>

      <!-- Превью: так выглядит плеер (декоративно) -->
      <div class="preview" style="--i: 2" aria-hidden="true">
        <span class="preview__cover">
          <span class="preview__disc" />
        </span>
        <span class="preview__meta">
          <span class="preview__title">Ваш любимый трек</span>
          <span class="preview__artist">Любимый исполнитель</span>
          <span class="preview__bar"><span class="preview__fill" /></span>
        </span>
        <span class="preview__eq"><i /><i /><i /><i /></span>
        <Heart class="preview__like" fill="currentColor" />
        <SkipForward class="preview__next" fill="currentColor" />
      </div>

      <section class="features" aria-labelledby="features-title">
        <h2 id="features-title" class="features__title" style="--i: 3">
          Что умеет
        </h2>
        <ul class="features__grid">
          <li v-for="(f, i) in FEATURES" :key="f.title" class="feature" :style="{ '--i': i + 4 }">
            <span class="feature__icon"><component :is="f.icon" /></span>
            <span class="feature__text">
              <strong>{{ f.title }}</strong>
              <span>{{ f.text }}</span>
            </span>
          </li>
        </ul>
        <p v-if="installHint" class="features__install">
          <Download /> {{ installHint }}
        </p>
      </section>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.welcome {
  position: relative;
  min-height: 100dvh;
  // clip, а не hidden: hidden делает блок контейнером прокрутки и ломает «прилипание» карточки входа
  overflow-x: clip;
  background: var(--c-bg);

  // ---------- Фон ----------
  &__bg {
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  // Пятна — радиальные градиенты (без filter: blur — дёшево), медленно плавают
  &__blob {
    position: absolute;
    width: 70vmax;
    height: 70vmax;
    border-radius: 50%;
    background: radial-gradient(closest-side, color-mix(in srgb, var(--c-accent) 34%, transparent), transparent);
    will-change: transform;

    &.is-a {
      top: -30vmax;
      left: -20vmax;
      animation: blob-a 22s ease-in-out infinite alternate;
    }

    &.is-b {
      right: -30vmax;
      top: 10vh;
      opacity: 0.7;
      animation: blob-b 26s ease-in-out infinite alternate;
    }

    &.is-c {
      bottom: -40vmax;
      left: 10vw;
      opacity: 0.55;
      animation: blob-c 30s ease-in-out infinite alternate;
    }
  }

  // «Волна» эквалайзера вдоль низа экрана
  &__wave {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 4px;
    height: 16vh;
    padding: 0 8px;
    opacity: 0.12;
    // К верху растворяется
    mask-image: linear-gradient(to top, #000 30%, transparent);

    i {
      flex: 1;
      height: calc(100% * var(--h));
      border-radius: 4px 4px 0 0;
      background: var(--c-accent);
      transform-origin: bottom;
      animation: wave 2.4s ease-in-out calc(var(--i) * -0.11s) infinite;
    }
  }

  // ---------- Раскладка ----------
  // Компьютер: слева — о приложении, справа — вход (прилипает при прокрутке). Телефон — одна колонка, вход сразу после заголовка.
  &__inner {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(320px, 400px);
    grid-template-areas:
      'hero auth'
      'preview auth'
      'features auth';
    align-items: start;
    gap: var(--space-6) clamp(var(--space-6), 6vw, 96px);
    max-width: 1120px;
    margin: 0 auto;
    padding: clamp(var(--space-6), 8vh, 96px) var(--space-6) var(--space-7);

    @include down(lg) {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: 'hero' 'auth' 'preview' 'features';
      max-width: 560px;
      gap: var(--space-5);
      padding: calc(var(--space-6) + env(safe-area-inset-top)) var(--space-4) calc(var(--space-6) + env(safe-area-inset-bottom));
    }
  }

  // Блоки появляются лесенкой
  .hero,
  .auth,
  .features__title,
  .feature {
    animation: rise-in 0.6s cubic-bezier(0.2, 0, 0, 1) both;
    animation-delay: calc(var(--i, 0) * 70ms + 100ms);
  }
}

// ---------- Первый экран ----------
.hero {
  grid-area: hero;
  display: grid;
  justify-items: start;
  gap: var(--space-4);

  &__title {
    font-size: clamp(2.2rem, 5.5vw, 3.75rem);
    font-weight: 800;
    letter-spacing: -0.035em;
    line-height: 1.02;
  }

  &__accent {
    background: linear-gradient(90deg, var(--c-accent), color-mix(in srgb, var(--c-accent) 55%, var(--c-text)));
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
  }

  &__lead {
    max-width: 52ch;
    color: var(--c-text-muted);
    font-size: var(--fs-lg);
    line-height: 1.5;

    @include down(md) {
      font-size: var(--fs-md);
    }
  }
}

// ---------- Вход ----------
.auth {
  @include glass(true);

  grid-area: auth;
  position: sticky;
  top: var(--space-6);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
  padding: var(--space-6) var(--space-5);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);

  @include down(lg) {
    position: static;
  }

  &__title {
    font-size: var(--fs-xl);
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  &__sub,
  &__note {
    margin-bottom: var(--space-2);
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__note {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    background: var(--c-accent-soft);
    color: var(--c-text);
  }

  &__link {
    @include reset-button;

    justify-self: center;
    margin-top: var(--space-1);
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
    text-decoration: underline;
    text-underline-offset: 3px;

    @include hover {
      color: var(--c-text);
    }
  }

  &__error {
    color: var(--c-danger);
    font-size: var(--fs-sm);
  }
}

// ---------- Превью плеера ----------
.preview {
  @include glass;

  grid-area: preview;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  max-width: 460px;
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  // Появление и потом лёгкое «парение»
  animation:
    rise-in 0.6s cubic-bezier(0.2, 0, 0, 1) 240ms both,
    float 6s ease-in-out 1s infinite;

  &__cover {
    position: relative;
    display: grid;
    place-items: center;
    flex: none;
    width: 56px;
    height: 56px;
    overflow: hidden;
    border-radius: var(--radius-md);
    background: conic-gradient(from 200deg, var(--c-accent), color-mix(in srgb, var(--c-accent) 40%, #ff7a59), color-mix(in srgb, var(--c-accent) 50%, #3b82f6), var(--c-accent));
  }

  // Абстрактная «пластинка» на обложке — медленно вращается
  &__disc {
    width: 60%;
    height: 60%;
    border-radius: 50%;
    background: radial-gradient(circle, rgb(255 255 255 / 0.9) 0 14%, transparent 15% 34%, rgb(255 255 255 / 0.25) 35% 37%, transparent 38%);
    animation: spin 8s linear infinite;
  }

  &__meta {
    display: grid;
    flex: 1;
    gap: 2px;
    min-width: 0;
  }

  &__title {
    @include truncate;

    font-weight: 700;
  }

  &__artist {
    @include truncate;

    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }

  &__bar {
    height: 3px;
    margin-top: 6px;
    overflow: hidden;
    border-radius: var(--radius-full);
    background: var(--c-surface-active);
  }

  &__fill {
    display: block;
    height: 100%;
    background: var(--c-accent);
    transform-origin: left;
    animation: progress 14s linear infinite;
  }

  &__eq {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 16px;

    i {
      width: 3px;
      height: 100%;
      border-radius: 1px;
      background: var(--c-accent);
      transform-origin: bottom;
      animation: eq 0.9s ease-in-out infinite;

      &:nth-child(2) { animation-delay: -0.3s; }
      &:nth-child(3) { animation-delay: -0.6s; }
      &:nth-child(4) { animation-delay: -0.15s; }
    }
  }

  &__like,
  &__next {
    flex: none;
    width: 20px;
    height: 20px;
  }

  &__like {
    color: var(--c-accent);
  }

  &__next {
    color: var(--c-text-muted);
  }
}

// ---------- Возможности ----------
.features {
  grid-area: features;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);

  &__title {
    font-size: var(--fs-xl);
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);

    @include down(sm) {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  &__install {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border: 1px dashed var(--c-glass-border);
    border-radius: var(--radius-lg);
    color: var(--c-text-muted);
    font-size: var(--fs-sm);

    svg {
      flex: none;
      width: 18px;
      height: 18px;
      margin-top: 1px;
      color: var(--c-accent);
    }
  }
}

.feature {
  @include glass;

  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);

  &__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: var(--c-accent-soft);
    color: var(--c-accent);

    svg {
      width: 20px;
      height: 20px;
    }
  }

  &__text {
    display: grid;
    gap: 4px;
    min-width: 0;

    strong {
      font-size: var(--fs-md);
    }

    span {
      color: var(--c-text-muted);
      font-size: var(--fs-sm);
      line-height: 1.45;
    }
  }
}

@keyframes blob-a {
  to { transform: translate(18vmax, 14vmax) scale(1.1); }
}

@keyframes blob-b {
  to { transform: translate(-16vmax, 20vmax) scale(0.9); }
}

@keyframes blob-c {
  to { transform: translate(14vmax, -18vmax) scale(1.15); }
}

@keyframes wave {
  0%,
  100% { transform: scaleY(1); }
  50% { transform: scaleY(0.45); }
}

@keyframes float {
  0%,
  100% { translate: 0 0; }
  50% { translate: 0 -6px; }
}

@keyframes progress {
  from { transform: scaleX(0.05); }
  to { transform: scaleX(1); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes eq {
  0%,
  100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
}
</style>
