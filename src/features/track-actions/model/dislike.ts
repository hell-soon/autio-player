import { usePlayer } from '@/entities/player'
import { useToast } from '@/shared/ui'

/**
 * «Больше не предлагать»: трек убирается из очереди (играл — переключаемся дальше),
 * радио его больше не ставит, в Яндекс уходит дизлайк. В уведомлении — «Отменить».
 */
export function useDislike() {
  const player = usePlayer()
  const toast = useToast()

  function dislike(t: Track) {
    const undoLocal = player.dislike(t)
    $fetch('/api/yandex/dislike', { method: 'POST', body: { track: t } }).catch(() => {})
    toast.show('Больше не предложим', 'default', 5000, {
      label: 'Отменить',
      run: () => {
        undoLocal()
        $fetch('/api/yandex/dislike', { method: 'POST', body: { track: t, undo: true } }).catch(() => {})
      },
    })
  }
  return { dislike }
}
