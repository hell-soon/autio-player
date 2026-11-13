/**
 * Главная «для вас»: всё персональное одним запросом.
 * Блоки грузятся параллельно и независимо — сбой одного не ломает остальные.
 * Подборки кэшируются на 10 минут (сбрасываются при подключении/отключении сервиса и по ?fresh),
 * история прослушивания всегда свежая.
 */
export default defineEventHandler(async (event): Promise<HomeFeed> => {
  const userId = await requireUserId(event)
  const fresh = getQuery(event).fresh !== undefined

  const feed = await cached(`u:${userId}:home`, 10 * 60_000, () => buildFeed(event, userId), { fresh })
  const [local, mixes] = await Promise.all([recentTracks(userId, 30), mixCards(userId)])
  return { ...feed, mixes, recent: mergeRecent(local, feed.recent) }
})

async function buildFeed(event: Parameters<typeof requireUserId>[0], userId: string): Promise<Omit<HomeFeed, 'mixes'>> {
  const conn = await listConnections(userId)
  const y = !!conn.yandex
  const spotifyAcc = conn.spotify ? await getAccount(userId, 'spotify') : null
  // Разрешения известны — проверяем по ним; аккаунт подключён до того, как мы их сохраняли, — по ответам API.
  const scopeKnown = !!spotifyAcc?.scope
  const scopesOk = scopeKnown ? hasSpotifyScopes(spotifyAcc!.scope) : true
  const s = !!spotifyAcc
  let forbidden = false

  const settle = async <T>(p: () => Promise<T>, fallback: T, label: string, spotify = false) => {
    try {
      return await p()
    }
    catch (e: any) {
      if (spotify && e?.statusCode === 403 && !scopeKnown) forbidden = true
      console.warn(`[home] ${label}:`, e?.statusCode ?? '', e?.message)
      return fallback
    }
  }

  const canPersonal = s && scopesOk
  const [personal, stations, chart, spotifyRecent, spotifyTop, spotifyArtists, spotifyPlaylists] = await Promise.all([
    y ? settle(() => yandexPersonalPlaylists(event), [] as PlaylistInfo[], 'yandex personal') : [],
    y ? settle(() => yandexStations(event), [] as StationInfo[], 'yandex stations') : [],
    y ? settle(() => yandexChart(event), [] as Track[], 'yandex chart') : [],
    canPersonal ? settle(() => spotifyRecentlyPlayed(event), [] as Track[], 'spotify recent', true) : [],
    canPersonal ? settle(() => spotifyTopTracks(event), [] as Track[], 'spotify top', true) : [],
    canPersonal ? settle(() => spotifyTopArtists(event), [] as SpotifyArtistInfo[], 'spotify artists', true) : [],
    s ? settle(() => spotifyMyPlaylists(event), [] as SpotifyPlaylistInfo[], 'spotify playlists', true) : [],
  ])

  return {
    connections: { yandex: y, spotify: s },
    personal,
    stations,
    chart,
    recent: spotifyRecent,
    spotifyTop,
    spotifyArtists,
    spotifyPlaylists,
    spotifyNeedsReconnect: s && (!scopesOk || forbidden),
  }
}

/** История сайта + недавнее из Spotify, без повторов. */
function mergeRecent(primary: Track[], extra: Track[]) {
  const seen = new Set<string>()
  return [...primary, ...extra].filter((t) => {
    if (seen.has(t.uid)) return false
    seen.add(t.uid)
    return true
  }).slice(0, 30)
}
