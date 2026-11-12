<script setup lang="ts">
import { PlaylistPage } from '@/pages/playlist'

const route = useRoute()
</script>

<template>
  <PlaylistPage :id="String(route.params.id)" />
</template>
