/** Текст песни (синхронизированный, если есть). Кэш на сутки — тексты не меняются. */
export default defineEventHandler(async (event): Promise<Lyrics | null> => {
  const track = await readTrackBody(event)
  return cached(`lyrics:${track.uid}`, 24 * 3600_000, () => findLyrics(event, track))
})
