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

После любых изменений: `npx nuxt typecheck`, `npm run check:autoimport` и `npm run build` должны проходить без ошибок; изменённые серверные маршруты — дёрнуть настоящим запросом на собранном сервере.

## Структура

```
src/                      # srcDir Nuxt, слои FSD
  app.vue                 # точка входа (тонкая): тема + NuxtLayout/NuxtPage
  app/                    # слой app: routes/ (файловые маршруты Nuxt), layouts/, middleware/, plugins/, styles/
  pages/                  # FSD-страницы (home, search, library, liked, playlist, album, artist, remote-playlist, stats, settings, login)
  widgets/                # player-bar, now-playing, track-list, collection-view, track-shelf, app-navigation, ambient-backdrop
  features/               # like-track, add-to-playlist, track-actions, search-tracks, start-wave, device-picker,
                          # player-controls, sleep-timer, hotkeys, import-likes, import-playlists, manage-playlist, switch-theme,
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
- Мобильная версия — обязательна (пользуются с телефона). **Любой** `display: grid` с колонкой, где есть обрезаемый текст или горизонтальная лента, — `grid-template-columns: minmax(0, 1fr)` (не `1fr` и не без шаблона): иначе колонка растягивается по содержимому и страница листается вбок (особенно заметно в PWA на iPhone). У `.shell__main` стоит `overflow-x: hidden` как страховка — она прячет симптом, а не причину; при проверке смотреть `main.scrollWidth - main.clientWidth`. **Порядок правил важен:** `@include down(md) { display: none }` должен стоять ПОСЛЕ блока, где задан `display` того же элемента (одинаковая специфичность — побеждает последнее правило). Мобильные переопределения удобно собирать в один `@include down(md) { … }` в конце стилей компонента.
- На тач-экранах ссылки внутри строк/карточек треков отключены (`pointer-events: none` при `pointer: coarse`): тап всегда запускает трек. Брейкпоинты: sm 480, md 768, lg 1024, xl 1280. Учитывать `env(safe-area-inset-*)`.
- Иконочные кнопки — `UiIconButton` с обязательным `label` (доступность). Цели нажатия на тач-экранах — не меньше 32×32 (`@media (pointer: coarse)`).
- Обложки — через `UiCover` / `coverOfSize(url, cssPx)` из `@/shared/lib`: у Яндекса размер в адресе (`…/600x600`), в списках грузим маленькие; размытым фонам хватает 100 px.
- `UiInput autofocus` фокусирует поле и при переходе внутри сайта (только `pointer: fine`): иначе набранный текст уходит на страницу, а пробел — горячая клавиша паузы.

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
- «Вышло новое» (`releases.ts`, `/api/releases`, кэш 6 ч): релизы за 90 дней у любимых исполнителей (`tasteOf` из `mixes.ts`), Яндекс `brief-info.lastReleases` + `direct-albums`; без `releaseDate` релиз не показывается.
- Поиск по тексту песни (`lyrics-search.ts`, `/api/search/lyrics`): кандидаты из поиска Яндекса проверяются по их тексту (в выдачу — только где фраза реально есть) + Genius API при заданном `NUXT_GENIUS_TOKEN`. LRCLIB по тексту **не ищет** (`q` — только название/исполнитель/альбом).
- «Микс дня» / «Открытия недели» (`mixes.ts`, `/api/mixes/{daily|discover}`, страница `/collection/mix:…`): собираются из истории и лайков, новые треки — радио Яндекса по исполнителю и похожие исполнители (`brief-info`). Хранятся в таблице `mixes` (один набор на всех устройствах до конца дня/недели по Москве), сборка детерминирована по зерну `userId:kind:period`.
- Импорт/экспорт плейлистов (`playlist-transfer.ts`, `/api/transfer/*`, `/api/playlists/:id/export`): импорт копирует треки как есть; экспорт ищет чужие треки (`findSpotifyMatch` / `findYandexMatch`) и возвращает ненайденные. Яндекс: `users/{uid}/playlists/create` + `playlists/{kind}/change` (form: kind, revision, diff `[{op:'insert',at,tracks:[{id,albumId}]}]`). Spotify: `POST /me/playlists`, `POST /playlists/{id}/items`, нужен scope `playlist-modify-private` (старые подключения → 409 «переподключите»).

- **«Чем я пользуюсь»** (`users.services`: yandex | spotify | both, в сессии `user.services`; null/нет — both): новый пользователь получает сервис, через который вошёл; подключил второй — `both`. Сервер берёт сервисы для подборок/поиска через `activeConnections()` (подключённые ∩ выбранные). Клиент — `useMusicServices()` из `@/entities/preferences`: прячет лишнее (`hasYandex` / `hasSpotify`), при `yandex` плеер играет всё через Яндекс (`setMusicServices`). Новые места, где упоминается сервис, проверять по этим флагам — друзья могут пользоваться без Spotify.

- **Лайки — двусторонняя синхронизация** (`like-sync.ts`): лайк/снятие на сайте сразу уходит в сервис (`syncLikeToService`); `syncLikes` сверяет с сервисом (фоном при открытии сайта и возврате на вкладку, не чаще раза в 5 мин на сервис — `accounts.likes_synced_at`; кнопка «Синхронизировать лайки» — принудительно): новое в сервисе → на сайт; было на сайте до прошлой сверки, а в сервисе нет → снимаем; новое на сайте, а в сервисе нет → досылаем. Треки Яндекса сравниваются по id трека **без альбома**. Если список Spotify обрезан (>1000) — снятий не делаем.
- **Приветствие** `/welcome` («Чем вы пользуетесь?» → подключить сервис): `users.onboarded` (новые — false, старые — true), в сессии `user.onboarded`; глобальный middleware ведёт туда, пока не пройдено.

- **Друзья** (`friends.ts`, `/api/friends/*`, `/api/shares/*`, `/api/me/privacy`): друзья — все пользователи сайта (приглашены владельцем). «Сейчас играет» — из `devices.state` онлайн-устройств. Приватность в `users`: `hide_now_playing` (не показывать трек и «Слушать вместе»), `private_history` (история и топ); плейлисты и число любимых видны всегда. Плейлист друга — `/collection/friend:UID:PID`, любимые — `/collection/friend-liked:UID` (только чтение, копию можно сохранить). «Отправить другу» — таблица `shares`, значок непросмотренных — на «Друзьях».
- **«Слушать вместе»** (`features/listen-together`): старт синхронно в клике по данным из списка (iOS), дальше опрос `/api/friends/:id/now` раз в 4 с: смена трека → включаем, расхождение > 6 с → seek, пауза/игра — как у друга; ручное переключение выключает режим (естественный конец трека — нет).
- В текстах про друзей не использовать род («был/была», «скрыл») — пол неизвестен.

- **Умные плейлисты** (`smart-playlists.ts`, `/api/smart`, `/collection/smart:KIND`): liked-month | top | forgotten | not-liked | new-week — правила по истории (год) и лайкам, считаются при открытии. **История** — `/history`, API `/api/history/log?q=&before=` (курсор по времени, поиск ILIKE по названию/исполнителям). **Совпадение вкусов** — `/api/friends/:id/match` (косинус по весам исполнителей: лайк 2, прослушивание за 90 дней 1; `enoughData` — минимум 3 исполнителя у каждого), «Общее у нас» — `/collection/taste:UID`.
- Поиск: последние запросы — localStorage `search:recent` (запоминаются, если запрос «прижился» 1,5 с и что-то нашёл); подсказки — `/api/search/suggest` (Яндекс `/search/suggest?part=`, разбор мягкий).
- Скелетоны вместо спиннеров: `UiSkeleton`, `UiSkeletonRows`, `CollectionSkeleton` (раскладка совпадает со страницей). «Нет соединения» — `widgets/network-status`. Сгенерированные обложки — `PlaylistCover :name` (цвет от названия). Быстрые действия иконки — `shortcuts` в `public/manifest.webmanifest` (`/?start=wave` запускает волну; на iOS shortcuts не поддерживаются).

## Клиент: плеер

- `src/entities/player/model/player.ts` — модульный синглтон (состояние меняется только на клиенте). Внешний API — `usePlayer()`.
- Два движка: `lib/yandex-engine.ts` (два `<audio>`: предзагрузка следующего трека, кроссфейд) и `lib/spotify-engine.ts` (Web Playback SDK). Выбор — `pickEngine()`.
- **iOS:** звук стартует только синхронно в обработчике жеста. Не ставить `await` перед `play()`; если сначала нужен запрос — вызвать `unlock()` в клике (пример: `startRadio`).
- Media Session (экран блокировки) — `lib/media-session.ts`.
- **Качество звука** (`player.quality`: auto | lq | nq | hq, параметр `?quality=` у `/api/yandex/stream` и `match-stream`): «Авто» — hq, в мобильной сети nq, при Save-Data lq. Если `get-file-info` не принял качество — запасной `download-info` выбирает битрейт сам.
- **Умный кроссфейд** (`smartCrossfade`): треки одного альбома подряд не накладываются; наложение ≤ ¼ более короткого трека.
- **Кэш следующих треков** (`prefetchUpcoming` → `postMessage('prefetch-audio')` → `public/sw.js`): SW скачивает 3 следующих трека в `audio-*` (до 5 шт.) и отдаёт их `<audio>` с поддержкой Range (206 — иначе Safari не играет). Работает, только если CDN Яндекса отдаёт CORS, иначе тихо выключается. SW вмешивается в `/api/yandex/stream*` только при попадании в кэш или без сети.
- Недоступный трек (ошибка загрузки, `onError(msg, skippable=true)`) пропускается автоматически, не больше 3 подряд.
- **View Transitions** (`experimental.viewTransition`): переходы между страницами; «перелёт» обложки — имя `cover-hero` (ставит `heroCover` из `@/shared/lib` на обложку нажатой карточки, постоянно — у обложки в шапке `CollectionView`) и `np-cover` (обложка мини-плеера, пока карточка закрыта ↔ обложка карточки). Одно имя — максимум у одного элемента на странице. Открытие/закрытие карточки — `useNowPlayingView().show/hide(animate)`; при уходе со страницы — `hide(false)` (иначе оборвётся переход Nuxt). **На телефонах (не `pointer: fine`) — без View Transition**, обычная CSS-шторка на `transform`: VT фотографирует весь экран, и на iPhone открытие тормозило. Карточка собирается заранее (`requestIdleCallback`) и дальше только показывается `v-show` — не собирать её в момент нажатия; видео и визуализатор — только пока открыта. Размытые фоны (карточка, `AmbientBackdrop`) — маленькая картинка с небольшим blur, растянутая `scale(4)`: так же на вид, в разы дешевле. На компьютере: Карточка (`np-sheet`) выезжает снизу, обложка (`np-cover`) летит поверх неё (`z-index` у групп задан явно — иначе браузер может положить обложку под карточку). На время перехода `html[data-vt=np-open|np-close]` снимает имена `page`/`cover-hero` у содержимого страницы — **иначе страница рисуется поверх карточки** (так и было «глючное» открытие на телефоне). Перед снимком ждём декодирования большой обложки (≤ 250 мс); у `UiCover` в мини-плеере и карточке `:fade="false"` — иначе на снимке пусто. Свайп вниз: шторка едет за пальцем (`--drag`), отпустили — уезжает вниз с того же места или пружинит обратно.
- Строка трека: долгое нажатие (телефон) и правая кнопка (компьютер) открывают меню «⋮»; click после удержания трек не запускает.
- **Выбор нескольких** (`TrackList`, пункт меню «Выбрать несколько»): выбор хранится по номерам строк (один трек может стоять дважды), сбрасывается при смене списка и Esc; панель действий телепортирована в body. Событие `remove` у `TrackList` — всегда массив треков.
- **«Отменить»** (`toast.show(text, tone, ms, { label, run })`): удаление из плейлиста — `batch-delete` возвращает места треков по порядку, `restore` вставляет их по возрастанию мест (после удаления позиции перенумеровываются без дыр — иначе вернутся не туда); снятие лайка — повторный лайк.
- **«Больше не предлагать»** (`useDislike` из `features/track-actions`, `player.dislike`): трек убирается из оставшейся очереди, попадает в localStorage `player:blocked` (радио его отфильтровывает в `fetchMore`), в Яндекс уходит дизлайк `/api/yandex/dislike` (`undo: true` — снять).
- «Сведения о треке» — `features/track-info` (`/api/tracks/info`). Жанры Яндекса приходят кодами — `genreLabel` из `@/shared/lib`.
- **Карточка «Сейчас играет» на телефоне**: обложка по высоте экрана (`100dvh − 430px − safe-area`, минимум 180 px) — название, управление и действия на первом экране; лайк — справа от названия. Жесты: обложку влево/вправо — следующий/предыдущий (в `touchend`), двойное касание — лайк с сердечком, вниз — свернуть; направление фиксируется по первым 10 px. Обложка меняется только после загрузки новой картинки (`shown`, не дольше 1,2 с), старая и новая лежат в одной ячейке grid и едут одновременно (без `mode="out-in"` — иначе пустой промежуток). Размытые фоны — `useLoadedSrc` (иначе фон пропадает при быстром листании).
- **Анимации** (`shared/styles/_motion.scss`, всё гасится при «уменьшить движение»): переход страниц — двигается только `.shell__main` (`view-transition-name: page`), направление вперёд/назад ставит `plugins/page-transition.client.ts` в `html[data-vt]` (без атрибута — другие переходы, например перелёт обложки, не трогаются); строки списков — `rise-in` лесенкой по `--i`; `UiSegmented` — «пилюля» едет к выбранному; `UiDialog` — `@starting-style` + `allow-discrete`; обложки `UiCover` проявляются после загрузки (только загруженные на клиенте). Анимировать `transform`/`opacity`, не `width`/`top` (прогресс мини-плеера — `scaleX`). Значок в `UiIconButton` — 55 % от родителя: обёртка вокруг значка должна быть на всю кнопку.
- Мини-плеер на телефоне: полоса касания над нижней полоской прогресса — перемотка пальцем с подсказкой времени.
- `player.unlock()` — вызвать в клике, если перед `playQueue` нужен запрос («Перемешать всё», «Случайный альбом» в библиотеке), иначе iOS не даст звук.
- Мини-плеер на телефоне: свайп влево/вправо — следующий/предыдущий трек (`next/previous` вызываются в `touchend` — это жест, iOS разрешит звук); после горизонтального жеста `click` не открывает карточку.
- Акцент «Из обложки» (`data-accent="cover"`, `useCoverAccent` в switch-theme, `coverAccent` в shared/lib): цвет считается на canvas из копии обложки через `/api/cover` (прокси только для доменов обложек Яндекса/Spotify — иначе браузер не даст читать пиксели); выставляет `--accent-dark/--accent-light` на `<html>`, они зарегистрированы через `@property` и плавно анимируются.
- Полноэкранный режим «Сейчас играет» (`widgets/now-playing/ui/ImmersiveView.vue`): караоке-текст (`LyricsPanel karaoke`, общий `useCurrentLyrics`), визуализатор на весь низ; F — открыть карточку, ещё раз F — режим, Esc — выход.
- Видеообложки (`entities/track/ui/TrackVideo.vue`, `/api/yandex/track-video/:id` → поле `backgroundVideoUri` трека): формат ссылки не задокументирован — видео показывается, только если реально заиграло.
- `initPlayer` запускается в хуке `app:suspense:resolve` (после гидрации): восстановленный трек и громкость меняют разметку — раньше гидрации будет mismatch.
- **Визуализатор** (`lib/analyser.ts`, `ui/AudioVisualizer.vue`): только компьютер и движок Яндекса (звук Spotify под DRM). `<audio>` грузится с `crossOrigin="anonymous"`; если CDN не отдал CORS — визуализатор выключается до перезагрузки, трек перезапускается без CORS. Элемент подключается к AudioContext **только когда уже играет с CORS и контекст запущен** — подключённый элемент звучит только через контекст (иначе тишина). Не ломать этот порядок.
- **Подключение устройств** (`model/connect.ts`): каждое окно сайта — устройство; синхронизация опросом `/api/devices/sync` (на Vercel нет WebSocket), команды — `/api/devices/command`. Частота адаптивная: 1,5 с при взаимодействии устройств, 4 с в простое, скрытая вкладка без музыки не опрашивает вовсе (бережём лимиты Neon); после выполнения команды устройство отчитывается сразу (0,4 с).
- **«Продолжить с того же места»:** при синхронизации устройство отправляет снимок очереди (только при изменении) в `devices.queue`; при открытии сайта `initPlayer` берёт `/api/devices/resume` и через `restore()` показывает последний трек на паузе с той же позиции (`pendingStartMs`). Если что-то играет на другом онлайн-устройстве — вместо этого плеер становится пультом. Устройства Spotify Connect — с префиксом `sp:` (через `/api/spotify/connect/*`). Если `controlling` не null — `usePlayer()` показывает состояние удалённого устройства, а действия уходят ему командами; UI об этом не знает.
- Данные страниц — `useCachedFetch(url, { key, ttl })` из `@/shared/lib` (на `useAsyncData`): **lazy** — переход на страницу не ждёт данных (страница со скелетом сразу); кэш между переходами; один запрос на ключ (`inflight`) — его подхватывает и предзагрузка. На SSR — `useRequestFetch` (иначе нет cookie сессии → 401). После изменения — `refreshNuxtData(key)`; смена реактивного адреса тоже грузит заново.
- **Предзагрузка по намерению** (`plugins/prefetch.client.ts`): касание/наведение на внутреннюю ссылку → `prefetchData` с теми же ключами, что у страниц (`dataFor(path)` — при новой странице с данными добавить её туда).
- **Скорость треков:** функции Vercel — `fra1` (`nitro.vercel.functions.regions`, рядом Neon); аккаунты кэшируются в памяти 60 с (`getAccount`, сброс `forgetAccount` при любом изменении); ссылка на поток — 90 с (`u:ID:stream:…`), заголовок `Server-Timing` у `/api/yandex/stream`. Клиент: следующий трек предзагружается через 4 с после старта (в мобильной сети — за 30 с до конца), касание строки трека «разогревает» ссылку (`player.warmTrack`).

## Окружение

```
NUXT_SESSION_PASSWORD   обязательно; 32+ символов; НЕ менять после запуска (им зашифрованы токены в БД)
NUXT_INVITE_CODE        код приглашения (первый пользователь — владелец, без кода)
DATABASE_URL            Neon; пусто → локальная PGlite (.data/pglite)
NUXT_SPOTIFY_CLIENT_ID / NUXT_SPOTIFY_CLIENT_SECRET   по желанию
NUXT_LASTFM_API_KEY / NUXT_LASTFM_SECRET               по желанию
NUXT_GENIUS_TOKEN       по желанию: Client Access Token с genius.com/api-clients — точнее «Поиск по тексту»
```

## Подводные камни

- Dev-сервер слушает **127.0.0.1** (Spotify не принимает `localhost` в Redirect URI; cookie у localhost и 127.0.0.1 разные). Redirect URI Spotify: `<origin>/api/auth/spotify/callback`.
- Nuxt превращает числовые env-значения в числа — приводить к строке (`String(...)`).
- PGlite — один процесс на папку: не запускать `db:push` и dev-сервер одновременно на одной `.data/pglite`.
- Service worker (`public/sw.js`) регистрируется только в прод-сборке; при изменении стратегии кэширования повышать `VERSION`. `/_nuxt/builds/` он **не кэширует** — иначе автообновление не узнает о новой сборке.
- **iPhone PWA и статус-бар:** `apple-mobile-web-app-status-bar-style` — только `default` (непрозрачный). С `black-translucent` iOS 26 даёт установленному приложению окно на высоту статус-бара короче экрана, снизу остаётся полоса, которую не закрасить ни CSS, ни JS (WebKit bug 301108; проверено — `100dvh`, `fixed inset: 0`, растягивание по `screen.height` не помогают, низ обрезается). Мета-теги `apple-mobile-web-app-*` фиксируются при установке — после изменения приложение нужно удалить с экрана «Домой» и добавить заново. `theme-color` на статус-бар в iOS 26 не влияет. Каркас `.shell` — `position: fixed; inset: 0`, полноэкранные слои — `inset: 0`/`height: 100%`, не `100dvh`.
- **Версия и автообновление** (`plugins/update.client.ts`): версия — `package.json` + коммит Vercel (`runtimeConfig.public.appVersion/commit/builtAt`, видно в настройках). Новая сборка проверяется каждые 5 мин (`experimental.checkOutdatedBuildInterval`) и при возврате на вкладку; применяется: в фоне без музыки — тихая перезагрузка, на сайте без музыки — при следующем переходе, при играющей музыке — уведомление «Обновить» (музыку не прерываем). При заметных изменениях повышать `version` в package.json.
- Файлы `.env*` агентам недоступны — список переменных сообщать пользователю текстом.
- Не трогать `.data/` пользователя в тестах (первый созданный пользователь станет владельцем) — тестовые базы держать во временной папке.

- **Ловушка автоимпорта (unimport):** имя, за которым сразу идёт приведение типа — `(NAME as Type)` — автоимпорт **не распознаёт**: в рантайме `ReferenceError: NAME is not defined`, typecheck молчит. Так дважды ломался сервер (`YANDEX_QUALITIES` → воспроизведение, `SMART_KINDS`). Вместо приведения — функция-проверка (`isSmartKind`, `parseYandexQuality`) или явный `import`. Проверка: `npm run check:autoimport`.
- **Заголовки ответа — только ASCII.** Кириллица в `setHeader` (даже в `Server-Timing` desc) — `Invalid character in header content`, маршрут падает (так ломалось воспроизведение). Тестовая база без Яндекса до таких строк не доходит (409 раньше) — проверять глазами.
- **Диагностика:** `/api/debug/status` (для вошедших) — применена ли схема базы (`db:push`), отвечают ли Яндекс и Spotify. Ошибки потоков пишутся в лог с понятной причиной (`withExplainedErrors`).

## Проверка изменений

- Типы и сборка: `npx nuxt typecheck`, `npm run build`.
- UI проверялся через Playwright (WebKit ≈ Safari, в т.ч. `devices['iPhone 15']`) на собранном сервере `node .output/server/index.mjs` с временной базой: Playwright ставить во временную папку, не в проект. Сессию для теста можно создать через `h3.useSession` с `name: 'nuxt-session'` и тем же `NUXT_SESSION_PASSWORD`.
- Перезапуск тестового сервера — `lsof -ti tcp:PORT -sTCP:LISTEN | xargs kill` (без `-sTCP:LISTEN` убьётся и браузер/клиент с соединением к порту — «слетают» сессии и т.п.).
- Заглушки `page.route('**/api/yandex/stream/**')` подменяют серверный обработчик — после изменений в нём обязательно дёрнуть реальный маршрут (`curl` на собранный сервер: без Яндекса ожидается 409, не 500).
- Сгенерированные звуки WAV + `page.route('**/api/yandex/stream/**')` позволяют проверить переходы/кроссфейд без реального Яндекса.
