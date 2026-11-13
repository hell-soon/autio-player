export interface ToastAction {
  label: string
  run: () => void
}

export interface Toast {
  id: number
  text: string
  tone: 'default' | 'error'
  /** Кнопка в уведомлении («Обновить») */
  action?: ToastAction
}

const toasts = ref<Toast[]>([])
let seq = 0

/** Короткие уведомления («Добавлено в плейлист»). Рендерятся <UiToaster/> в лейауте. */
export function useToast() {
  const dismiss = (id: number) => (toasts.value = toasts.value.filter(t => t.id !== id))

  /** ms = 0 — висит, пока не нажмут кнопку или не закроют (для уведомлений с действием) */
  function show(text: string, tone: Toast['tone'] = 'default', ms = 2600, action?: ToastAction) {
    const id = ++seq
    toasts.value = [...toasts.value.slice(-2), { id, text, tone, action }]
    if (ms > 0) setTimeout(() => dismiss(id), ms)
    return id
  }
  return { toasts: readonly(toasts), show, dismiss, error: (text: string) => show(text, 'error', 4000) }
}
