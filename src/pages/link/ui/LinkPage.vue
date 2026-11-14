<script setup lang="ts">
import { ApproveDevice } from '@/features/auth-by-code'
import { UiPageHeader } from '@/shared/ui'

/** «Войти на другом устройстве»: подтвердить вход по коду с экрана нового устройства (или из QR: /link?code=…) */
const route = useRoute()
const code = computed(() => String(route.query.code ?? ''))
</script>

<template>
  <div class="link-page">
    <UiPageHeader title="Войти на другом устройстве" />
    <section class="link-page__card">
      <ApproveDevice :initial-code="code" />
    </section>
  </div>
</template>

<style lang="scss" scoped>
.link-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
  max-width: 480px;

  &__card {
    @include glass;

    padding: var(--space-5);
    border-radius: var(--radius-lg);
  }
}
</style>
