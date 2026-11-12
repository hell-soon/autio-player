import { and, eq, gt, inArray, lte } from 'drizzle-orm'

const { devices, deviceCommands } = schema

/** Устройство считается онлайн, если синхронизировалось недавно. */
export const DEVICE_ONLINE_MS = 25_000
const MAX_COMMAND_AGE_MS = 60_000

export async function syncDevice(userId: string, input: { id: string, name: string, kind: DeviceKind, state: DeviceState | null }): Promise<DeviceSyncResponse> {
  const db = useDb()
  const now = Date.now()
  const state = input.state ? { ...input.state, at: now } : null

  await db.insert(devices).values({ id: input.id, userId, name: input.name, kind: input.kind, lastSeen: now, state })
    .onConflictDoUpdate({ target: devices.id, set: { userId, name: input.name, kind: input.kind, lastSeen: now, state } })

  // Забираем накопившиеся команды (свежие) и удаляем их.
  const cmds = await db.select().from(deviceCommands).where(eq(deviceCommands.deviceId, input.id)).orderBy(deviceCommands.id)
  if (cmds.length) {
    await db.delete(deviceCommands).where(and(eq(deviceCommands.deviceId, input.id), lte(deviceCommands.id, cmds.at(-1)!.id)))
  }

  const online = await db.select().from(devices)
    .where(and(eq(devices.userId, userId), gt(devices.lastSeen, now - DEVICE_ONLINE_MS)))

  return {
    devices: online.map(d => ({ id: d.id, name: d.name, kind: d.kind, lastSeen: d.lastSeen, state: d.state ?? null })),
    commands: cmds.filter(c => now - c.createdAt < MAX_COMMAND_AGE_MS).map(c => c.payload),
    serverTime: now,
  }
}

export async function sendDeviceCommand(userId: string, target: string, command: DeviceCommand) {
  const db = useDb()
  const d = await db.query.devices.findFirst({ where: and(eq(devices.id, target), eq(devices.userId, userId)) })
  if (!d) throw createError({ statusCode: 404, message: 'Устройство не найдено' })
  if (Date.now() - d.lastSeen > DEVICE_ONLINE_MS) throw createError({ statusCode: 409, message: 'Устройство не в сети' })
  await db.insert(deviceCommands).values({ deviceId: target, payload: command, createdAt: Date.now() })
}

/** Чистка «мёртвых» устройств пользователя (давно не появлялись). */
export async function pruneDevices(userId: string) {
  const db = useDb()
  const old = await db.select({ id: devices.id }).from(devices)
    .where(and(eq(devices.userId, userId), lte(devices.lastSeen, Date.now() - 30 * 24 * 3600_000)))
  if (old.length) await db.delete(devices).where(inArray(devices.id, old.map(o => o.id)))
}
