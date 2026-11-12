<script setup lang="ts">
import { RemotePlaylistPage } from '@/pages/remote-playlist'

const route = useRoute()
</script>

<template>
  <RemotePlaylistPage :id="String(route.params.id)" />
</template>
