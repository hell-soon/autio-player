<script setup lang="ts">
import { Headphones, X } from 'lucide-vue-next'
import { UiIconButton } from '@/shared/ui'
import { useListenTogether } from '../model/listen-together'

/** Плашка над плеером: «Слушаете вместе с …» — видно, почему музыка меняется сама. */
const together = useListenTogether()
</script>

<template>
  <div v-if="together.friend.value" class="together" role="status">
    <Headphones class="together__icon" />
    <span class="together__text">
      {{ together.status.value === 'waiting' ? `${together.friend.value.name}: сейчас тишина — ждём` : `Слушаете вместе · ${together.friend.value.name}` }}
    </span>
    <UiIconButton label="Перестать слушать вместе" size="sm" @click="together.stop()">
      <X />
    </UiIconButton>
  </div>
</template>

<style lang="scss" scoped>
.together {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  padding: 4px 4px 4px var(--space-3);
  border-radius: var(--radius-full);
  background: var(--c-accent);
  color: var(--c-on-accent);
  font-size: var(--fs-sm);
  font-weight: 600;

  &__icon {
    flex: none;
    width: 16px;
    height: 16px;
  }

  &__text {
    @include truncate;

    flex: 1;
  }
}
</style>
