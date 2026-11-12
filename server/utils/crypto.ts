import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/**
 * Шифрование токенов сервисов в БД (AES-256-GCM).
 * Ключ выводится из NUXT_SESSION_PASSWORD — при утечке файла БД токены не читаются.
 */
function key() {
  const secret = useRuntimeConfig().session.password
  if (!secret) throw new Error('NUXT_SESSION_PASSWORD не задан')
  return createHash('sha256').update(`tokens:${secret}`).digest()
}

export function encrypt(plain: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), data].map(b => b.toString('base64url')).join('.')
}

export function decrypt(payload: string) {
  const [iv, tag, data] = payload.split('.').map(p => Buffer.from(p, 'base64url'))
  const decipher = createDecipheriv('aes-256-gcm', key(), iv!)
  decipher.setAuthTag(tag!)
  return Buffer.concat([decipher.update(data!), decipher.final()]).toString('utf8')
}
