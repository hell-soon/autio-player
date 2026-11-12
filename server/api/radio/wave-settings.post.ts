const MOODS = ['all', 'active', 'fun', 'calm', 'sad']
const DIVERSITY = ['default', 'favorite', 'discover', 'popular']

/** Настройки «Моей волны» (настроение и характер). */
export default defineEventHandler(async (event) => {
  const { mood = 'all', diversity = 'default' } = await readBody<{ mood?: string, diversity?: string }>(event)
  if (!MOODS.includes(mood) || !DIVERSITY.includes(diversity)) throw createError({ statusCode: 400, message: 'Неверные настройки' })
  await yandexWaveSettings(event, mood, diversity)
  return { ok: true }
})
