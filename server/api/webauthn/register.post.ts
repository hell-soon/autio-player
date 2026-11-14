import type { AuthenticatorTransportFuture } from '@simplewebauthn/server'
import { eq } from 'drizzle-orm'

/**
 * Включить вход по Face ID / Touch ID: создать ключ (passkey) для уже вошедшего пользователя.
 * Ключ «запоминаемый» (resident) — потом вход без имени: устройство само предложит ключ этого сайта.
 */
export default defineWebAuthnRegisterEventHandler({
  async validateUser(_body, event) {
    const { user } = await requireUserSession(event)
    // Имя в связке ключей: «Audio · Имя»
    return { userName: user.name || 'Слушатель', displayName: user.name || 'Слушатель' }
  },
  async excludeCredentials(event) {
    const { user } = await requireUserSession(event)
    const rows = await useDb().select({ id: schema.passkeys.id, transports: schema.passkeys.transports })
      .from(schema.passkeys).where(eq(schema.passkeys.userId, user.id))
    return rows.map(r => ({ id: r.id, transports: (r.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined }))
  },
  getOptions() {
    return {
      rpName: 'Audio',
      authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
    }
  },
  storeChallenge: storeWebAuthnChallenge,
  getChallenge: takeWebAuthnChallenge,
  async onSuccess(event, { credential }) {
    const { user } = await requireUserSession(event)
    await useDb().insert(schema.passkeys).values({
      id: credential.id,
      userId: user.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
      backedUp: credential.backedUp,
      transports: credential.transports ?? null,
      name: deviceLabel(event),
      createdAt: Date.now(),
    }).onConflictDoNothing()
  },
})
