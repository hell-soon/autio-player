/** Команда устройству Spotify Connect. deviceId — без префикса "sp:". */
export default defineEventHandler(async (event) => {
  const { deviceId, command } = await readBody<{ deviceId?: string, command?: DeviceCommand }>(event)
  if (!deviceId || !command) throw createError({ statusCode: 400, message: 'Неверная команда' })
  await spotifyRemoteCommand(event, deviceId, command)
  return { ok: true }
})
