<script setup lang="ts">
import { ArtistPage } from '@/pages/artist'

const route = useRoute()
</script>

<template>
  <ArtistPage :id="String(route.params.id)" />
</template>
