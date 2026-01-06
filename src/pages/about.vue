<script setup lang="ts">
import { useVersionStore } from "@/stores/versionStore";
import { LogoGithub } from "@vicons/ionicons5";

definePage({
  meta: {
    title: "关于",
  },
});

const versionStore = useVersionStore();

const openFrontendRepo = () => {
  window.open("https://github.com/MeowSalty/pinai-frontend", "_blank");
};

const openBackendRepo = () => {
  window.open("https://github.com/MeowSalty/pinai", "_blank");
};
</script>

<template>
  <n-flex vertical align="center">
    <n-card style="width: 400px">
      <n-thing>
        <template #header> PinAI Frontend </template>
        <template #header-extra>
          <n-button circle :focusable="false" size="small" @click="openFrontendRepo">
            <template #icon>
              <LogoGithub />
            </template>
          </n-button>
        </template>
        <template #description> Version {{ versionStore.currentVersion || "加载中..." }} </template>
        基于 Vue 3 + TypeScript + Naive UI 的管理后台，前端苦手先这样凑合用吧（x
      </n-thing>
    </n-card>
    <n-card style="width: 400px">
      <n-thing>
        <template #header> PinAI </template>
        <template #header-extra>
          <n-button circle :focusable="false" size="small" @click="openBackendRepo">
            <template #icon>
              <LogoGithub />
            </template>
          </n-button>
        </template>
        <!-- <template #description> Version {{ versionStore.currentVersion || "加载中..." }} </template> -->
        一个简单的 AI 路由平台，简单就好。
      </n-thing>
    </n-card>
  </n-flex>
</template>
