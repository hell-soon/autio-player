/** 215000 → "3:35" */
export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** 4_380_000 → "1 ч 13 мин" */
export function formatTotalDuration(ms: number) {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} мин`
  return `${Math.floor(min / 60)} ч ${min % 60} мин`
}

/** plural(5, ['трек', 'трека', 'треков']) → "треков" */
export function plural(n: number, forms: [string, string, string]) {
  const n10 = n % 10
  const n100 = n % 100
  if (n10 === 1 && n100 !== 11) return forms[0]
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms[1]
  return forms[2]
}

/** Жанры Яндекса приходят кодами (rusrap, electronics…) — переводим известные, остальные показываем как есть */
const GENRES: Record<string, string> = {
  pop: 'Поп', ruspop: 'Русская поп-музыка', rock: 'Рок', rusrock: 'Русский рок', rap: 'Рэп и хип-хоп', rusrap: 'Русский рэп',
  foreignrap: 'Зарубежный рэп', electronics: 'Электроника', dance: 'Танцевальная', house: 'Хаус', techno: 'Техно',
  indie: 'Инди', rusindie: 'Русское инди', alternative: 'Альтернатива', metal: 'Метал', jazz: 'Джаз', blues: 'Блюз',
  classical: 'Классика', rnb: 'R&B', soul: 'Соул', soundtrack: 'Саундтрек', folk: 'Фолк', relax: 'Расслабляющая',
  estrada: 'Эстрада', rusestrada: 'Русская эстрада', reggae: 'Регги', country: 'Кантри', punk: 'Панк',
  hardrock: 'Хард-рок', lounge: 'Лаунж', ambient: 'Эмбиент', dnb: 'Драм-н-бейс', dubstep: 'Дабстеп',
  edmgenre: 'EDM', phonkgenre: 'Фонк', kpop: 'K-pop', children: 'Детская', shanson: 'Шансон', videogame: 'Музыка из игр',
  'local-indie': 'Инди', posthardcore: 'Пост-хардкор', postrock: 'Пост-рок', newwave: 'Новая волна', trance: 'Транс',
}
export function genreLabel(code?: string) {
  if (!code) return ''
  return GENRES[code] ?? code.charAt(0).toUpperCase() + code.slice(1)
}

/** 12 345 → «12 тыс.», 1 234 567 → «1,2 млн» */
export function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн`
  if (n >= 10_000) return `${Math.round(n / 1000).toLocaleString('ru-RU')} тыс.`
  return n.toLocaleString('ru-RU')
}
