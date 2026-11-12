const KINDS = ['computer', 'phone', 'tablet']

/** Синхронизация устройства: сообщает своё состояние, получает список устройств и команды для себя. */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const body = await readBody<{ id?: string, name?: string, kind?: string, state?: DeviceState | null }>(event)
  if (!body?.id || !/^[\w-]{8,64}$/.test(body.id)) throw createError({ statusCode: 400, message: 'Неверный id устройства' })
  const kind = (KINDS.includes(body.kind ?? '') ? body.kind : 'computer') as DeviceKind
  const name = String(body.name ?? 'Устройство').slice(0, 60)
  if (Math.random() < 0.01) void pruneDevices(userId)
  return syncDevice(userId, { id: body.id, name, kind, state: body.state ?? null })
})
