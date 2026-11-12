export type SourcePreference = 'auto' | 'yandex' | 'spotify'

export const SOURCE_PREFERENCES: { value: SourcePreference, label: string }[] = [
  { value: 'auto', label: 'Авто' },
  { value: 'yandex', label: 'Яндекс' },
  { value: 'spotify', label: 'Spotify' },
]

/**
 * Какой сервис предпочитать, если трек/альбом есть в обоих (поиск склеивает дубли).
 * «Авто» — Яндекс: он играет на любом устройстве.
 */
export function useSourcePreference() {
  return useCookie<SourcePreference>('source_pref', { default: () => 'auto', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
}
