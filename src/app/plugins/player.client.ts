import { usePlayer } from '@/entities/player'

/** Запуск плеера на клиенте: громкость, Media Session, таймер позиции. */
export default defineNuxtPlugin({
  name: 'player',
  setup() {
    usePlayer().initPlayer()
  },
})
