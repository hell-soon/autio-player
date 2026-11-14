<script setup lang="ts">
import { Music } from 'lucide-vue-next'
import { coverOfSize } from '../../lib/cover-size'

const props = withDefaults(defineProps<{
  src?: string
  size?: number
  rounded?: 'sm' | 'md' | 'full'
  alt?: string
}>(), {
  size: 48,
  rounded: 'sm',
  alt: '',
})

const failed = ref(false)
// Картинка под размер на экране (у Яндекса CDN отдаёт нужный размер)
const sized = computed(() => coverOfSize(props.src, props.size))

/**
 * Плавное появление: картинка проявляется, когда загрузилась.
 * Только для тех, что грузятся уже на клиенте: пришедшие с сервером (и из кэша) видны сразу —
 * иначе до гидрации обложки были бы невидимыми.
 */
const img = ref<HTMLImageElement | null>(null)
const pending = ref(false)
function check() {
  pending.value = !!img.value && !img.value.complete
}
onMounted(check)
watch(() => props.src, () => {
  failed.value = false
  nextTick(check)
})
</script>

<template>
  <div class="ui-cover" :class="`ui-cover--${rounded}`" :style="{ width: `${size}px`, height: `${size}px` }">
    <img
      v-if="src && !failed"
      ref="img"
      :src="sized"
      :alt="alt"
      loading="lazy"
      decoding="async"
      :class="{ 'is-pending': pending }"
      @load="pending = false"
      @error="failed = true"
    >
    <Music v-else class="ui-cover__placeholder" />
  </div>
</template>

<style lang="scss" scoped>
.ui-cover {
  display: grid;
  place-items: center;
  flex: none;
  overflow: hidden;
  background: var(--c-surface);
  color: var(--c-text-subtle);

  &--sm {
    border-radius: var(--radius-sm);
  }

  &--md {
    border-radius: var(--radius-md);
  }

  &--full {
    border-radius: 50%;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity 0.35s var(--ease);

    &.is-pending {
      opacity: 0;
    }
  }

  &__placeholder {
    width: 40%;
    height: 40%;
  }
}
</style>
