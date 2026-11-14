import { usePlayer } from '@/entities/player'

/**
 * Запуск плеера на клиенте: громкость, Media Session, таймер позиции, «продолжить с того же места».
 * Только после гидрации: восстановленный трек и сохранённая громкость меняют разметку,
 * а сервер отрисовал страницу без них — иначе будет hydration mismatch.
 */
export default defineNuxtPlugin({
  name: 'player',
  setup(nuxtApp) {
    // Только для вошедших: на странице входа плеер опрашивал бы сервер устройств впустую (401).
    // Хук срабатывает и при переходах между страницами — после входа плеер запустится на первой же странице,
    // а повторно initPlayer ничего не делает.
    const { loggedIn } = useUserSession()
    nuxtApp.hook('app:suspense:resolve', () => {
      if (loggedIn.value) usePlayer().initPlayer()
    })
  },
})
