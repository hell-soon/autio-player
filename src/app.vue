<script setup lang="ts">
// Точка входа Nuxt (должна лежать в srcDir). Вся композиция приложения — в слое src/app.
import { useThemeHead } from '@/features/switch-theme'

useThemeHead()
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
