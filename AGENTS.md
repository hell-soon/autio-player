# Audio — руководство для ИИ-агентов

Веб-плеер музыки из **Яндекс Музыки** и **Spotify** в одном месте: общая библиотека, единый поиск, радио, синхронизация между устройствами, PWA. Несколько пользователей (личный сайт + друзья по коду приглашения).

Язык проекта — **русский**: интерфейс, комментарии в коде, сообщения об ошибках (`createError({ message })`). Идентификаторы — на английском.

## Стек

- **Nuxt 4** (Vue 3, Nitro), TypeScript. Деплой — **Vercel**.
- **SCSS** + свои компоненты. UI-библиотек и Tailwind **нет** — не добавлять.
- **Feature-Sliced Design** в `src/`.
- **Drizzle ORM + Postgres**: прод — **Neon** (`DATABASE_URL`), локально — **PGlite** в `.data/pglite` (ничего ставить не нужно).
- `nuxt-auth-utils` — сессии в зашифрованной cookie.
- Иконки — `lucide-vue-next` (явный импорт), шрифт Inter (`@fontsource-variable/inter`).

## Команды

```bash
npm run dev          # сначала создаёт/обновляет таблицы локальной PGlite, потом nuxt dev (http://127.0.0.1:3000)
npm run build        # прод-сборка (.output/)
npx nuxt typecheck   # проверка типов — через Golar (TypeScript 7; vue-tsc с ним НЕ работает)
npm run db:push      # применить схему: в Neon, если задан DATABASE_URL, иначе в локальную PGlite
npm run db:studio    # Drizzle Studio
```

После любых изменений: `npx nuxt typecheck` и `npm run build` должны проходить без ошибок.

## Структура

```
src/                      # srcDir Nuxt, слои FSD
  app.vue                 # точка входа (тонкая): тема + NuxtLayout/NuxtPage
  app/                    # слой app: routes/ (файловые маршруты Nuxt), layouts/, middleware/, plugins/, styles/
  pages/                  # FSD-страницы (home, search, library, liked, playlist, album, artist, remote-playlist, stats, settings, login)
  widgets/                # player-bar, now-playing, track-list, collection-view, track-shelf, app-navigation, ambient-backdrop
  features/               # like-track, add-to-playlist, track-actions, search-tracks, start-wave, device-picker,
                          # player-controls, sleep-timer, hotkeys, import-likes, manage-playlist, switch-theme,
                          # auth-by-yandex, auth-by-spotify, connect-lastfm
  entities/               # player (очередь, движки, подключение устройств), track, library, album, artist,
                          # spotify-account, preferences
  shared/                 # ui/ (Ui*-компоненты), lib/ (format, device, cached-fetch, tilt), styles/ (токены, темы, абстракции)
server/
  api/                    # маршруты Nitro (см. ниже)
  utils/                  # вся логика сервера (автоимпорт в Nitro)
  middleware/             # auth.ts — закрывает /api/*, 0.dev-host.ts — localhost → 127.0.0.1 в dev
  db/schema.ts            # схема Drizzle (pg-core)
shared/types/             # типы, общие для сервера и клиента (автоимпорт): Track, Collection, HomeFeed, DeviceState…
scripts/db-push.mjs       # обёртка над drizzle-kit push (используется в dev и db:push)
public/                   # manifest.webmanifest, sw.js (service worker), icons/
```

### Правила FSD (соблюдать)

- Слои импортируют только **нижележащие**: `app → pages → widgets → features → entities → shared`.
- **Соседние слайсы одного слоя не импортируют друг друга** (feature ↛ feature, widget ↛ widget). Если нужно составить — делать это уровнем выше или через слот (пример: `CollectionView` принимает список треков слотом, а не импортирует `TrackList`).
- Импорт слайса — только через его `index.ts` (public API): `import { TrackRow } from '@/entities/track'`.
- **Автоимпорт компонентов выключен** (`components: { dirs: [] }`): компоненты импортируются явно. Vue/Nuxt API (`ref`, `useFetch`…) автоимпортируются как обычно.
- Маршрут в `src/app/routes/*.vue` только подключает страницу из `src/pages` и задаёт `useHead`/`definePageMeta`.
- Внутренние компоненты слайса могут импортировать друг друга относительными путями (`./ArtistLinks.vue`).

## Стили и UI

- SCSS-абстракции (`src/shared/styles/abstracts/_index.scss`) **автоматически** подключаются в каждый `<style lang="scss">`: миксины `up(bp)`, `down(bp)`, `hover` (только для мыши), `focus-ring`, `truncate`, `visually-hidden`, `reset-button`, `glass($strong)`, `when-light`; карта `$accents`.
- Цвета — только через CSS-переменные (`--c-bg`, `--c-text`, `--c-text-muted`, `--c-surface*`, `--c-accent`, `--c-accent-soft`, `--c-panel`, `--c-glass-border`…), размеры — `--space-*`, `--radius-*`, `--fs-*`. Сырые цвета в компонентах не писать.
- Темы: `<html data-theme="system|dark|light" data-accent="lavender|sage|peach|sky">`, хранятся в cookie (SSR без мигания). Новые цвета добавлять в оба миксина `dark`/`light` в `_themes.scss`.
- Визуальный стиль: размытый «эмбиент» из обложки текущего трека на фоне + полупрозрачные стеклянные панели (`@include glass`).
- Ключи Sass-карт — в кавычках (`'lavender'`), иначе Sass считает их цветами.
- В scoped-стилях `:global(...)` не нужен для предков: Vue добавляет `data-v` только к последнему селектору (`:root[data-theme='light'] .x` работает).
- Мобильная версия — обязательна (пользуются с телефона). **Порядок правил важен:** `@include down(md) { display: none }` должен стоять ПОСЛЕ блока, где задан `display` того же элемента (одинаковая специфичность — побеждает последнее правило). Мобильные переопределения удобно собирать в один `@include down(md) { … }` в конце стилей компонента.
- На тач-экранах ссылки внутри строк/карточек треков отключены (`pointer-events: none` при `pointer: coarse`): тап всегда запускает трек. Брейкпоинты: sm 480, md 768, lg 1024, xl 1280. Учитывать `env(safe-area-inset-*)`.
- Иконочные кнопки — `UiIconButton` с обязательным `label` (доступность).

## Модель данных

- `Track` (`shared/types/track.ts`) — единый формат трека из любого источника. `uid = "<source>:<sourceId>"`; для Яндекса `sourceId = "trackId:albumId"`. Есть `artistIds` (параллельно `artists`) для ссылок.
- Таблицы (`server/db/schema.ts`): `users`, `accounts` (подключённые сервисы, токены **зашифрованы** AES-GCM ключом из `NUXT_SESSION_PASSWORD`), `tracks` (общий кэш метаданных), `likes`, `playlists`, `playlist_tracks`, `history`, `devices`, `device_commands`.
- **Время везде — unix-миллисекунды**, проставляется кодом (`Date.now()`), в Postgres — `bigint` (`mode: 'number'`). Не использовать `integer` для времени — переполнится.
- `count(...)` в сыром SQL приводить к `::int`, иначе Postgres вернёт строку.
- Схема меняется в `server/db/schema.ts`; локально применится сама при `npm run dev`, в Neon — `npm run db:push`.

## Сервер (Nitro)

- Все `/api/*` требуют входа (`server/middleware/auth.ts`), кроме маршрутов входа. id пользователя — `await requireUserId(event)`.
- Данные пользователя всегда фильтровать по `userId` (чужие плейлисты → 404).
- Ошибка «сервис не подключён» — **409**, не 401 (401 на клиенте значит «сессия сайта истекла»).
- Трек из тела запроса — только через `readTrackBody(event)` (валидация).
- Внешние API ходят только через утилиты: `ymFetch/ymGet/ymPost/ymPostForm` (Яндекс), `spotifyFetch` (Spotify) — они сами берут токен пользователя из БД и обновляют его.
- Кэш в памяти инстанса: `cached(key, ttlMs, fn)`; ключи пользователя — с префиксом `u:<userId>:`, сброс — `invalidateUserCache(userId)` (вызывается при подключении/отключении сервисов).

### Источники музыки

- **Яндекс Музыка — неофициальный API** (`server/utils/yandex.ts`, `yandex-feed.ts`): константы, подписи (`get-file-info` HMAC, `download-info` md5, тексты) и OAuth-данные официального Android-клиента сверены с `github.com/MarshalX/yandex-music-api`. Вход — device flow по коду (`ya.ru/device`), он же даёт токен Музыки. Ответы разбирать «мягко» (формат может меняться): если блок не распознан — не показывать, а не падать.
- Поток Яндекса: сервер отдаёт **302 на подписанный URL CDN**, звук идёт из браузера напрямую, не через Vercel. Кодеки — только поддерживаемые `<audio>` везде (aac/mp3), без flac.
- **Spotify — Web API + Web Playback SDK** (Development Mode, правила с февраля 2026): поиск `limit ≤ 10`; `/playlists/{id}/items` (не `/tracks`) и только свои плейлисты; библиотека — `PUT/DELETE /me/library?uris=…`; рекомендации, похожие, топ-треки исполнителя — **недоступны**. Не более 5 пользователей, каждого добавлять в Dashboard → User Management. Воспроизведение — только Premium и только в десктопных браузерах.
- Подбор музыки (радио, «Моя волна», станции, «похожее») — **только Яндекс** (`/rotor/...`).
- Трек Spotify там, где SDK недоступен (телефон, блокировки), играет через совпадение в Яндексе: `findYandexMatch` / `/api/yandex/match-stream`.
- Тексты: Яндекс → LRCLIB. Last.fm — скробблинг (`server/utils/lastfm.ts`).

## Клиент: плеер

- `src/entities/player/model/player.ts` — модульный синглтон (состояние меняется только на клиенте). Внешний API — `usePlayer()`.
- Два движка: `lib/yandex-engine.ts` (два `<audio>`: предзагрузка следующего трека, кроссфейд) и `lib/spotify-engine.ts` (Web Playback SDK). Выбор — `pickEngine()`.
- **iOS:** звук стартует только синхронно в обработчике жеста. Не ставить `await` перед `play()`; если сначала нужен запрос — вызвать `unlock()` в клике (пример: `startRadio`).
- Media Session (экран блокировки) — `lib/media-session.ts`.
- **Подключение устройств** (`model/connect.ts`): каждое окно сайта — устройство; синхронизация опросом `/api/devices/sync` (на Vercel нет WebSocket), команды — `/api/devices/command`. Частота адаптивная: 1,5 с при взаимодействии устройств, 4 с в простое, скрытая вкладка без музыки не опрашивает вовсе (бережём лимиты Neon); после выполнения команды устройство отчитывается сразу (0,4 с).
- **«Продолжить с того же места»:** при синхронизации устройство отправляет снимок очереди (только при изменении) в `devices.queue`; при открытии сайта `initPlayer` берёт `/api/devices/resume` и через `restore()` показывает последний трек на паузе с той же позиции (`pendingStartMs`). Если что-то играет на другом онлайн-устройстве — вместо этого плеер становится пультом. Устройства Spotify Connect — с префиксом `sp:` (через `/api/spotify/connect/*`). Если `controlling` не null — `usePlayer()` показывает состояние удалённого устройства, а действия уходят ему командами; UI об этом не знает.
- Данные страниц — `useCachedFetch(url, { key, ttl })` из `@/shared/lib` (кэш между переходами); после изменения — `refreshNuxtData(key)`.

## Окружение

```
NUXT_SESSION_PASSWORD   обязательно; 32+ символов; НЕ менять после запуска (им зашифрованы токены в БД)
NUXT_INVITE_CODE        код приглашения (первый пользователь — владелец, без кода)
DATABASE_URL            Neon; пусто → локальная PGlite (.data/pglite)
NUXT_SPOTIFY_CLIENT_ID / NUXT_SPOTIFY_CLIENT_SECRET   по желанию
NUXT_LASTFM_API_KEY / NUXT_LASTFM_SECRET               по желанию
```

## Подводные камни

- Dev-сервер слушает **127.0.0.1** (Spotify не принимает `localhost` в Redirect URI; cookie у localhost и 127.0.0.1 разные). Redirect URI Spotify: `<origin>/api/auth/spotify/callback`.
- Nuxt превращает числовые env-значения в числа — приводить к строке (`String(...)`).
- PGlite — один процесс на папку: не запускать `db:push` и dev-сервер одновременно на одной `.data/pglite`.
- Service worker (`public/sw.js`) регистрируется только в прод-сборке; при изменении стратегии кэширования повышать `VERSION`.
- Файлы `.env*` агентам недоступны — список переменных сообщать пользователю текстом.
- Не трогать `.data/` пользователя в тестах (первый созданный пользователь станет владельцем) — тестовые базы держать во временной папке.

## Проверка изменений

- Типы и сборка: `npx nuxt typecheck`, `npm run build`.
- UI проверялся через Playwright (WebKit ≈ Safari, в т.ч. `devices['iPhone 15']`) на собранном сервере `node .output/server/index.mjs` с временной базой: Playwright ставить во временную папку, не в проект. Сессию для теста можно создать через `h3.useSession` с `name: 'nuxt-session'` и тем же `NUXT_SESSION_PASSWORD`.
- Сгенерированные звуки WAV + `page.route('**/api/yandex/stream/**')` позволяют проверить переходы/кроссфейд без реального Яндекса.
