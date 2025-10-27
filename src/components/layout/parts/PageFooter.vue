<script setup lang="ts">
const currentYear = new Date().getFullYear();

// 使用编译时注入的版本号，如果没有注入则显示"预览版"
const appVersion = __APP_VERSION__ !== "0.0.0" ? __APP_VERSION__ : "latest";
</script>

<template>
  <n-layout-footer bordered style="height: 64px; display: flex; justify-content: center; align-items: center;">
    Copyright © {{ currentYear }} PinAI. All Rights Reserved. | Version {{ appVersion }}
  </n-layout-footer>
</template>
