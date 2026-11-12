export type WaveMood = 'all' | 'active' | 'fun' | 'calm' | 'sad'
export type WaveDiversity = 'default' | 'favorite' | 'discover' | 'popular'

export const MOODS: { value: WaveMood, label: string }[] = [
  { value: 'all', label: 'Любое' },
  { value: 'active', label: 'Бодрое' },
  { value: 'fun', label: 'Весёлое' },
  { value: 'calm', label: 'Спокойное' },
  { value: 'sad', label: 'Грустное' },
]

export const DIVERSITY: { value: WaveDiversity, label: string }[] = [
  { value: 'default', label: 'Как обычно' },
  { value: 'favorite', label: 'Любимое' },
  { value: 'discover', label: 'Незнакомое' },
  { value: 'popular', label: 'Популярное' },
]

/** Настройки «Моей волны» хранятся в аккаунте Яндекса; здесь — последний выбор для UI. */
export function useWaveSettings() {
  const mood = useCookie<WaveMood>('wave_mood', { default: () => 'all', maxAge: 60 * 60 * 24 * 365 })
  const diversity = useCookie<WaveDiversity>('wave_diversity', { default: () => 'default', maxAge: 60 * 60 * 24 * 365 })

  async function apply() {
    await $fetch('/api/radio/wave-settings', { method: 'POST', body: { mood: mood.value, diversity: diversity.value } })
  }
  return { mood, diversity, apply }
}
