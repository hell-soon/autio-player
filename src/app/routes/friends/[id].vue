<script setup lang="ts">
import { FriendPage } from '@/pages/friend'

const route = useRoute()
</script>

<template>
  <FriendPage :id="String(route.params.id)" />
</template>
