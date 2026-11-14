/** Вошедшее устройство: какое устройство просит вход по коду (перед «Разрешить») */
export default defineEventHandler(async (event) => {
  await requireUserId(event)
  return loginLinkInfo(parseLinkCode(getQuery(event).code))
})
