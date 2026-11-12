/** Устройства Spotify Connect (колонки, приложение Spotify на телефоне…). */
export default defineEventHandler(async (event) => {
  const acc = await getAccount(await requireUserId(event), 'spotify')
  if (!acc?.premium) return [] // управление воспроизведением в Spotify — только с Premium
  return spotifyDevices(event).catch(() => [])
})
