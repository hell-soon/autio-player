/**
 * Какими сервисами пользуется человек: «Яндекс», «Spotify» или «Оба».
 * Хранится в базе и в сессии (cookie) — известно сразу при SSR, без запросов.
 * Интерфейс прячет всё про неиспользуемый сервис; при «Только Яндекс» и треки Spotify играют через Яндекс.
 */
export const MUSIC_SERVICES: { value: MusicServices, label: string }[] = [
  { value: 'yandex', label: 'Яндекс' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'both', label: 'Оба' },
]

export function useMusicServices() {
  const { user, fetch } = useUserSession()
  const services = computed<MusicServices>(() => user.value?.services ?? 'both')

  async function setServices(value: MusicServices) {
    await $fetch('/api/me/services', { method: 'PATCH', body: { services: value } })
    await fetch() // обновить сессию на клиенте
    await refreshNuxtData() // подборки и поиск зависят от выбора
  }

  return {
    services,
    hasYandex: computed(() => services.value !== 'spotify'),
    hasSpotify: computed(() => services.value !== 'yandex'),
    setServices,
  }
}
