/** Ключи входа (Face ID / Touch ID) текущего пользователя */
export default defineEventHandler(async event => listPasskeys(await requireUserId(event)))
