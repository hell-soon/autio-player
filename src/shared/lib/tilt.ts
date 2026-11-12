import type { Ref } from 'vue'

/**
 * 3D-наклон элемента за курсором. Пишет CSS-переменные на элемент:
 *   --tilt-rx / --tilt-ry — углы поворота (deg),
 *   --tilt-x  / --tilt-y  — положение курсора от -1 до 1 (без единиц — для смещений через calc),
 *   --tilt-gx / --tilt-gy — позиция блика (%),
 *   --tilt-active        — 1 пока курсор над элементом.
 * Элемент может появляться и исчезать (v-if) — обработчики перевешиваются автоматически.
 * Только для мыши/трекпада; при prefers-reduced-motion ничего не делает.
 */
export function useTilt(el: Ref<HTMLElement | null>, opts: { max?: number } = {}) {
  const max = opts.max ?? 12
  let frame = 0

  function set(node: HTMLElement, x: number, y: number, active: 0 | 1) {
    // x, y — от -1 до 1
    node.style.setProperty('--tilt-rx', `${-y * max}deg`)
    node.style.setProperty('--tilt-ry', `${x * max}deg`)
    node.style.setProperty('--tilt-x', String(x))
    node.style.setProperty('--tilt-y', String(y))
    node.style.setProperty('--tilt-gx', `${(x + 1) * 50}%`)
    node.style.setProperty('--tilt-gy', `${(y + 1) * 50}%`)
    node.style.setProperty('--tilt-active', String(active))
  }

  function onMove(e: PointerEvent) {
    if (e.pointerType === 'touch') return
    const node = e.currentTarget as HTMLElement
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      const r = node.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width) * 2 - 1
      const y = ((e.clientY - r.top) / r.height) * 2 - 1
      set(node, Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)), 1)
    })
  }

  function onLeave(e: PointerEvent) {
    cancelAnimationFrame(frame)
    set(e.currentTarget as HTMLElement, 0, 0, 0)
  }

  function detach(node: HTMLElement | null | undefined) {
    node?.removeEventListener('pointermove', onMove)
    node?.removeEventListener('pointerleave', onLeave)
  }

  watch(el, (node, old) => {
    detach(old)
    if (!node || import.meta.server) return
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!finePointer || reduced) return
    node.addEventListener('pointermove', onMove)
    node.addEventListener('pointerleave', onLeave)
  }, { flush: 'post' })

  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    detach(el.value)
  })
}
