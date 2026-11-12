/** Ссылка на исполнителя: по id источника, а если id нет — по имени (страница найдёт его в Яндексе). */
export function artistHref(track: Track, index: number) {
  const id = track.artistIds?.[index]
  const name = track.artists[index] ?? ''
  return id ? `/artist/${track.source}:${id}` : `/artist/name:${encodeURIComponent(name)}`
}

/** Название трека ведёт на его альбом (отдельной страницы трека нет). */
export function albumHref(track: Track) {
  return track.albumId ? `/album/${track.source}:${track.albumId}` : undefined
}

/** Ссылка, которой можно поделиться: альбом с подсвеченным треком, иначе — поиск. */
export function shareHref(track: Track) {
  const base = import.meta.client ? location.origin : ''
  if (track.albumId) return `${base}/album/${track.source}:${track.albumId}?t=${encodeURIComponent(track.uid)}`
  return `${base}/search?q=${encodeURIComponent(`${track.artists[0] ?? ''} ${track.title}`.trim())}`
}
