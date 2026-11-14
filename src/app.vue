<script setup lang="ts">
// Точка входа Nuxt (должна лежать в srcDir). Вся композиция приложения — в слое src/app.
import { useThemeHead } from '@/features/switch-theme'
import AppSplash from '@/app/ui/AppSplash.vue'
import interCyrillic from '@fontsource-variable/inter/files/inter-cyrillic-wght-normal.woff2?url'
import interLatin from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url'

useThemeHead()
// Шрифт — сразу из HTML, не дожидаясь CSS: текст раньше рисуется Inter, меньше подмен шрифта
useHead({
  link: [interCyrillic, interLatin].map(href => ({ rel: 'preload', as: 'font', type: 'font/woff2', href, crossorigin: '' })),
})
</script>

<template>
  <NuxtRouteAnnouncer />
  <AppSplash />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
