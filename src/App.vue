<script setup lang="ts">
import MainLayout from '@/components/layout/MainLayout.vue';
</script>

<template>
  <n-dialog-provider>
    <n-message-provider>
      <MainLayout />
    </n-message-provider>
  </n-dialog-provider>
</template>

<style scoped>
</style>
