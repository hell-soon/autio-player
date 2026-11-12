const TYPES = ['play-queue', 'handoff', 'enqueue', 'pause', 'resume', 'next', 'previous', 'seek', 'volume']

/** Отправить команду другому своему устройству. */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const { target, command } = await readBody<{ target?: string, command?: DeviceCommand }>(event)
  if (!target || !command || !TYPES.includes(command.type)) throw createError({ statusCode: 400, message: 'Неверная команда' })
  // Очередь ограничиваем, чтобы запрос не разрастался.
  if (command.type === 'play-queue') command.queue = command.queue.slice(0, 300)
  await sendDeviceCommand(userId, target, command)
  return { ok: true }
})
