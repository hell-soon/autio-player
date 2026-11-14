import { and, eq } from 'drizzle-orm'

/** «Перемешать всю библиотеку»: любимые + треки всех своих плейлистов, без повторов (до 2000). */
export default defineEventHandler(async (event): Promise<Track[]> => {
  const userId = await requireUserId(event)
  const { playlists, playlistTracks, tracks } = schema
  const [liked, inPlaylists] = await Promise.all([
    getLikedTracks(userId),
    useDb().select({ t: tracks }).from(playlistTracks)
      .innerJoin(playlists, eq(playlistTracks.playlistId, playlists.id))
      .innerJoin(tracks, eq(playlistTracks.trackUid, tracks.uid))
      .where(and(eq(playlists.userId, userId)))
      .limit(5000),
  ])
  const seen = new Set<string>()
  return [...liked, ...inPlaylists.map(r => rowToTrack(r.t))].filter(t => !seen.has(t.uid) && seen.add(t.uid)).slice(0, 2000)
})
