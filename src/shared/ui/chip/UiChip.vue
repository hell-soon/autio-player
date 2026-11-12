<template>
  <span class="ui-chip"><slot /></span>
</template>

<style lang="scss" scoped>
.ui-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text-muted);
  font-size: var(--fs-xs);
  font-weight: 500;
  white-space: nowrap;

  :deep(svg) {
    width: 13px;
    height: 13px;
  }
}
</style>
