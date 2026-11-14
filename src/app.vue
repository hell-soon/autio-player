<script setup lang="ts">
// Точка входа Nuxt (должна лежать в srcDir). Вся композиция приложения — в слое src/app.
import { useThemeHead } from '@/features/switch-theme'
import AppSplash from '@/app/ui/AppSplash.vue'

useThemeHead()
</script>

<template>
  <NuxtRouteAnnouncer />
  <AppSplash />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
