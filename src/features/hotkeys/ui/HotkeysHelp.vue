<script setup lang="ts">
import { UiDialog } from '@/shared/ui'
import { HOTKEYS, hotkeysHelpOpen } from '../model/hotkeys'
</script>

<template>
  <UiDialog v-model:open="hotkeysHelpOpen" title="Горячие клавиши">
    <dl class="hotkeys">
      <template v-for="h in HOTKEYS" :key="h.keys">
        <dt><kbd>{{ h.keys }}</kbd></dt>
        <dd>{{ h.action }}</dd>
      </template>
    </dl>
  </UiDialog>
</template>

<style lang="scss" scoped>
.hotkeys {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: var(--space-2) var(--space-4);

  dd {
    margin: 0;
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
  }
}

kbd {
  display: inline-block;
  padding: 2px 8px;
  border: 1px solid var(--c-border);
  border-bottom-width: 2px;
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  font-family: inherit;
  font-size: var(--fs-xs);
  font-weight: 600;
  white-space: nowrap;
}
</style>
