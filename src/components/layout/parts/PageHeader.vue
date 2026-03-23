<script setup lang="ts">
import ServerSwitcher from '@/components/layout/parts/ServerSwitcher.vue'
</script>

<template>
  <n-layout-header bordered>
    <ServerSwitcher :width="164" />
  </n-layout-header>
</template>

<style>
.n-layout-header {
  height: 64px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
