<script setup lang="ts">
/**
 * Анимированная обложка трека Яндекса («видеошот»): ложится поверх обычной обложки
 * и проявляется, только когда видео реально пошло. Нет видео / ошибка — остаётся обложка.
 * Без звука, по кругу; пауза вместе с музыкой. Не грузится при «Экономии трафика» и reduced motion.
 */
const props = defineProps<{ track: Track, playing: boolean }>()

const url = ref<string | null>(null)
const ready = ref(false)
const video = ref<HTMLVideoElement | null>(null)
const cache = useState<Record<string, string | null>>('track-video', () => ({}))

function allowed() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
}

watch(() => props.track.uid, async () => {
  ready.value = false
  url.value = null
  const t = props.track
  if (t.source !== 'yandex' || !allowed()) return
  const key = t.sourceId
  if (!(key in cache.value)) {
    const r = await $fetch<{ url: string | null }>(`/api/yandex/track-video/${encodeURIComponent(key)}`).catch(() => ({ url: null }))
    cache.value[key] = r.url
  }
  if (props.track.uid === t.uid) url.value = cache.value[key] ?? null
}, { immediate: true })

watch([() => props.playing, ready], ([p]) => {
  const v = video.value
  if (!v) return
  if (p) v.play().catch(() => {})
  else v.pause()
})
</script>

<template>
  <video
    v-if="url"
    ref="video"
    :key="url"
    class="track-video"
    :class="{ 'is-ready': ready }"
    :src="url"
    muted
    loop
    playsinline
    autoplay
    preload="auto"
    aria-hidden="true"
    disablepictureinpicture
    @playing="ready = true"
    @error="url = null"
  />
</template>

<style lang="scss" scoped>
.track-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.6s var(--ease);
  pointer-events: none;

  &.is-ready {
    opacity: 1;
  }
}
</style>
