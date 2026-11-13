import { usePlayer } from '@/entities/player'

/**
 * Запуск плеера на клиенте: громкость, Media Session, таймер позиции, «продолжить с того же места».
 * Только после гидрации: восстановленный трек и сохранённая громкость меняют разметку,
 * а сервер отрисовал страницу без них — иначе будет hydration mismatch.
 */
export default defineNuxtPlugin({
  name: 'player',
  setup(nuxtApp) {
    // Хук срабатывает и при переходах между страницами — initPlayer повторно ничего не делает
    nuxtApp.hook('app:suspense:resolve', () => usePlayer().initPlayer())
  },
})
