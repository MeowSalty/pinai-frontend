<script setup lang="ts">
import { useVersionStore } from "@/stores/versionStore";
import { useThemeStore } from "@/stores/themeStore";
import { useRouter } from "vue-router";
import { onMounted } from "vue";
import { SunnyOutline, MoonOutline, InformationCircleOutline } from "@vicons/ionicons5";

const versionStore = useVersionStore();
const themeStore = useThemeStore();
const router = useRouter();

// 组件挂载时初始化版本检查
onMounted(() => {
  versionStore.initialize();
});

const handleThemeToggle = () => {
  themeStore.toggle();
};

const handleAboutClick = () => {
  router.push("/about");
};
</script>

<template>
  <n-layout-footer
    bordered
    style="height: 64px; display: flex; justify-content: center; align-items: center; gap: 16px"
  >
    <n-button quaternary circle @click="handleThemeToggle" title="切换主题">
      <template #icon>
        <n-icon :component="themeStore.isDark ? SunnyOutline : MoonOutline" />
      </template>
    </n-button>
    <n-button quaternary circle @click="handleAboutClick" title="关于">
      <template #icon>
        <n-icon :component="InformationCircleOutline" />
      </template>
    </n-button>
  </n-layout-footer>
</template>
