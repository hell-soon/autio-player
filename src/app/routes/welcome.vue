<script setup lang="ts">
import { WelcomePage } from '@/pages/welcome'

definePageMeta({ layout: 'blank' })
useHead({ title: 'Добро пожаловать' })
</script>

<template>
  <WelcomePage />
</template>
