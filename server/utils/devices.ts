import { and, eq, gt, inArray, lte } from 'drizzle-orm'

const { devices, deviceCommands } = schema

/** Устройство считается онлайн, если синхронизировалось недавно. */
export const DEVICE_ONLINE_MS = 25_000
const MAX_COMMAND_AGE_MS = 60_000

export async function syncDevice(userId: string, input: { id: string, name: string, kind: DeviceKind, state: DeviceState | null, queue?: DeviceQueue | null }): Promise<DeviceSyncResponse> {
  const db = useDb()
  const now = Date.now()
  const state = input.state ? { ...input.state, at: now } : null
  // Пустое состояние не затирает последнее непустое — чтобы потом можно было продолжить.
  const set = {
    userId,
    name: input.name,
    kind: input.kind,
    lastSeen: now,
    ...(state ? { state } : {}),
    // Очередь присылается только когда изменилась.
    ...(input.queue ? { queue: input.queue } : {}),
  }

  await db.insert(devices).values({ id: input.id, userId, name: input.name, kind: input.kind, lastSeen: now, state, queue: input.queue ?? null })
    .onConflictDoUpdate({ target: devices.id, set })

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

/**
 * Что играло последним — на любом устройстве пользователя (для «продолжить с того же места»).
 * null, если прямо сейчас что-то играет на другом онлайн-устройстве (тогда плеер станет пультом).
 */
export async function lastPlayback(userId: string, selfId: string): Promise<ResumeState | null> {
  const now = Date.now()
  const list = await useDb().select().from(devices).where(eq(devices.userId, userId))
  const playingElsewhere = list.some(d => d.id !== selfId && now - d.lastSeen < DEVICE_ONLINE_MS && d.state?.isPlaying)
  if (playingElsewhere) return null
  const last = list.filter(d => d.state?.track).sort((a, b) => b.state!.at - a.state!.at)[0]
  if (!last?.state?.track) return null
  // Если играло — досчитываем позицию до момента, когда устройство пропало из сети.
  const s = last.state
  const played = s.isPlaying ? Math.min(last.lastSeen - s.at, s.durationMs) : 0
  return {
    track: s.track!,
    positionMs: Math.max(0, Math.min(s.positionMs + played, Math.max(0, s.durationMs - 1000))),
    queue: last.queue ?? null,
    deviceName: last.name,
    at: s.at,
  }
}
