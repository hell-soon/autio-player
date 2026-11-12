/**
 * Вход через Яндекс «по коду»: сайт показывает код, пользователь вводит его на ya.ru/device.
 * device_code хранится в зашифрованной httpOnly cookie (на Vercel нет общей памяти между запросами).
 */
export default defineEventHandler(async (event) => {
  const { invite } = await readBody<{ invite?: string }>(event).catch(() => ({ invite: undefined }))
  const code = await yandexRequestDeviceCode()

  setCookie(event, 'ya_device', encrypt(JSON.stringify({ deviceCode: code.device_code, invite: invite ?? '' })), {
    httpOnly: true,
    sameSite: 'lax',
    secure: getRequestURL(event).protocol === 'https:',
    maxAge: code.expires_in,
    path: '/api/auth/yandex',
  })

  return {
    userCode: code.user_code,
    verificationUrl: code.verification_url,
    interval: code.interval,
    expiresIn: code.expires_in,
  }
})
