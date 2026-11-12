<template>
  <span class="ui-spinner" role="status" aria-label="Загрузка" />
</template>

<style lang="scss" scoped>
.ui-spinner {
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
