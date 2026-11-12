/** Какие сервисы подключены у текущего пользователя. */
export default defineEventHandler(async (event) => listConnections(await requireUserId(event)))
