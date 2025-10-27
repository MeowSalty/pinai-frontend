<script setup lang="ts">
import { useVersionStore } from "@/stores/versionStore";
import { onMounted } from "vue";

const currentYear = new Date().getFullYear();

const versionStore = useVersionStore();

// 组件挂载时初始化版本检查
onMounted(() => {
  versionStore.initialize();
});
</script>

<template>
  <n-layout-footer
    bordered
    style="height: 64px; display: flex; justify-content: center; align-items: center"
  >
    <n-space align="center" :size="8">
      <span>Copyright © {{ currentYear }} PinAI. All Rights Reserved.</span>
      |
      <n-space align="center" :size="4">
        <n-badge :show="versionStore.shouldShowUpdateBadge" dot processing :offset="[3, 0]">
          <n-button
            text
            tag="a"
            href="https://github.com/MeowSalty/pinai-frontend/releases"
            target="_blank"
            style="color: inherit"
          >
            <span>Version {{ versionStore.currentVersion }}</span>
          </n-button>
        </n-badge>
      </n-space>
    </n-space>
  </n-layout-footer>
</template>
