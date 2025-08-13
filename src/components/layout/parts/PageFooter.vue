<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>

<template>
  <n-layout-footer bordered style="height: 64px; display: flex; justify-content: center; align-items: center;">
    Copyright © {{ currentYear }} PinAI. All Rights Reserved. | Version 1.0.0
  </n-layout-footer>
</template>
