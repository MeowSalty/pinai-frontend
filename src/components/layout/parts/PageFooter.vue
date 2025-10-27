<script setup lang="ts">
import { useVersionStore } from "@/stores/versionStore";
import { onMounted } from "vue";

const currentYear = new Date().getFullYear();

// 使用编译时注入的版本号，如果没有注入则显示"预览版"
const appVersion = __APP_VERSION__ !== "0.0.0" ? __APP_VERSION__ : "latest";

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
      <n-divider vertical />
      <n-space align="center" :size="4">
        <span>Version {{ appVersion }}</span>
        <n-badge v-if="versionStore.shouldShowUpdateBadge" dot type="error" :offset="[-2, 2]">
          <n-button
            text
            tag="a"
            href="https://github.com/MeowSalty/pinai-frontend/releases"
            target="_blank"
            style="color: inherit"
          >
            <span>Version {{ appVersion }}</span>
          </n-button>
        </n-badge>
      </n-space>
    </n-space>
  </n-layout-footer>
</template>
