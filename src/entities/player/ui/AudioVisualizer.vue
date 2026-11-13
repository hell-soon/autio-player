<script setup lang="ts">
import { usePlayer } from '../model/player'

/**
 * Полосы спектра текущего трека (канвас). Рисуются, только когда анализатор действительно работает:
 * треки Яндекса на компьютере, CDN отдал звук с CORS. Иначе компонент пустой — без «фальшивой» анимации.
 */
const BARS = 48
const MIN_HZ = 40
const MAX_HZ = 16_000

const p = usePlayer()
const canvas = ref<HTMLCanvasElement | null>(null)
const active = ref(false)

let raf = 0
let data: Uint8Array<ArrayBuffer> | null = null
const levels = new Float32Array(BARS)
let color = ''
let colorAt = 0

/** Границы полос в логарифмической шкале частот — как слышит ухо */
function bandEdges(node: AnalyserNode) {
  const nyquist = node.context.sampleRate / 2
  const bins = node.frequencyBinCount
  return Array.from({ length: BARS + 1 }, (_, i) => {
    const hz = MIN_HZ * (MAX_HZ / MIN_HZ) ** (i / BARS)
    return Math.min(bins - 1, Math.round((hz / nyquist) * bins))
  })
}

let edges: number[] = []
let edgesFor: AnalyserNode | null = null

function draw() {
  raf = requestAnimationFrame(draw)
  const node = p.analyserNode()
  const c = canvas.value
  active.value = !!node
  if (!node || !c) return

  if (edgesFor !== node) {
    edges = bandEdges(node)
    edgesFor = node
    data = new Uint8Array(node.frequencyBinCount)
  }
  node.getByteFrequencyData(data!)

  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = c.clientWidth
  const h = c.clientHeight
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr)
    c.height = Math.round(h * dpr)
  }
  const g = c.getContext('2d')!
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  g.clearRect(0, 0, w, h)

  // Цвет акцента берём из темы (раз в секунду — тема может смениться)
  const now = performance.now()
  if (!color || now - colorAt > 1000) {
    color = getComputedStyle(c).getPropertyValue('--c-accent').trim() || '#fff'
    colorAt = now
  }
  g.fillStyle = color

  const gap = 3
  const bw = Math.max(2, (w - gap * (BARS - 1)) / BARS)
  for (let i = 0; i < BARS; i++) {
    let sum = 0
    let n = 0
    for (let k = edges[i]!; k <= Math.max(edges[i]!, edges[i + 1]! - 1); k++) {
      sum += data![k]!
      n++
    }
    const v = (n ? sum / n : 0) / 255
    // Быстро вверх, плавно вниз
    levels[i] = v > levels[i]! ? v : levels[i]! * 0.9 + v * 0.1
    const bh = Math.max(2, levels[i]! ** 1.6 * h)
    const x = i * (bw + gap)
    g.globalAlpha = 0.35 + levels[i]! * 0.65
    g.beginPath()
    g.roundRect(x, h - bh, bw, bh, Math.min(bw / 2, 3))
    g.fill()
  }
  g.globalAlpha = 1
}

onMounted(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  raf = requestAnimationFrame(draw)
})
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <canvas ref="canvas" class="visualizer" :class="{ 'is-active': active && p.isPlaying.value }" aria-hidden="true" />
</template>

<style lang="scss" scoped>
.visualizer {
  display: block;
  width: 100%;
  height: 56px;
  opacity: 0;
  transition: opacity var(--dur) var(--ease);

  &.is-active {
    opacity: 1;
  }
}
</style>
