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
