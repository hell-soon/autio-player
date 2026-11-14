import type { AuthenticatorTransportFuture } from '@simplewebauthn/server'
import { eq } from 'drizzle-orm'

/** Вход по Face ID / Touch ID: устройство само предлагает ключ этого сайта (без имени пользователя). */
export default defineWebAuthnAuthenticateEventHandler({
  storeChallenge: storeWebAuthnChallenge,
  getChallenge: takeWebAuthnChallenge,
  async getCredential(_event, credentialId) {
    const row = await useDb().query.passkeys.findFirst({ where: eq(schema.passkeys.id, credentialId) })
    if (!row) throw createError({ statusCode: 400, message: 'Этот ключ не найден — возможно, его удалили в настройках' })
    return {
      id: row.id,
      publicKey: row.publicKey,
      counter: row.counter,
      backedUp: row.backedUp,
      transports: (row.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined,
      userId: row.userId,
    }
  },
  async onSuccess(event, { credential, authenticationInfo }) {
    const db = useDb()
    await db.update(schema.passkeys).set({ counter: authenticationInfo.newCounter, lastUsedAt: Date.now() })
      .where(eq(schema.passkeys.id, credential.id))
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, String(credential.userId)) })
    if (!user) throw createError({ statusCode: 400, message: 'Пользователь не найден' })
    await startSession(event, user)
  },
})
