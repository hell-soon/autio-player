/** API коллекции по её id в адресе /collection/:id (общий для страницы и предзагрузки ссылок). */
export function remoteCollectionUrl(fullId: string) {
  const [source, ...rest] = fullId.split(':')
  const id = rest.join(':')
  if (source === 'mix') return `/api/mixes/${encodeURIComponent(id)}`
  if (source === 'smart') return `/api/smart/${encodeURIComponent(id)}`
  if (source === 'taste') return `/api/friends/${encodeURIComponent(id)}/common`
  // Плейлист друга ("friend:UID:PID") и его любимые ("friend-liked:UID") — только чтение
  if (source === 'friend') {
    const [uid, pid] = id.split(':')
    return `/api/friends/${encodeURIComponent(uid!)}/playlists/${encodeURIComponent(pid!)}`
  }
  if (source === 'friend-liked') return `/api/friends/${encodeURIComponent(id)}/likes`
  return source === 'spotify' ? `/api/spotify/playlists/${encodeURIComponent(id)}` : `/api/yandex/playlists/${encodeURIComponent(id)}`
}
