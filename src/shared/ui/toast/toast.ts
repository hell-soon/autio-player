export interface Toast {
  id: number
  text: string
  tone: 'default' | 'error'
}

const toasts = ref<Toast[]>([])
let seq = 0

/** Короткие уведомления («Добавлено в плейлист»). Рендерятся <UiToaster/> в лейауте. */
export function useToast() {
  function show(text: string, tone: Toast['tone'] = 'default', ms = 2600) {
    const id = ++seq
    toasts.value = [...toasts.value.slice(-2), { id, text, tone }]
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, ms)
  }
  return { toasts: readonly(toasts), show, error: (text: string) => show(text, 'error', 4000) }
}
