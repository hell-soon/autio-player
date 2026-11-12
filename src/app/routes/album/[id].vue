<script setup lang="ts">
import { AlbumPage } from '@/pages/album'

const route = useRoute()
</script>

<template>
  <AlbumPage :id="String(route.params.id)" />
</template>
