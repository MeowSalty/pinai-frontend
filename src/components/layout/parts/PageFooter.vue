<script setup lang="ts">
import { useVersionStore } from "@/stores/versionStore";
import { useThemeStore } from "@/stores/themeStore";
import { useRouter } from "vue-router";
import { computed, onMounted } from "vue";
import {
  SunnyOutline,
  MoonOutline,
  DesktopOutline,
  InformationCircleOutline,
} from "@vicons/ionicons5";

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

const themeIcon = computed(() => {
  switch (themeStore.mode) {
    case "light":
      return SunnyOutline;
    case "dark":
      return MoonOutline;
    case "system":
    default:
      return DesktopOutline;
  }
});

const themeTitle = computed(() => {
  switch (themeStore.mode) {
    case "light":
      return "主题：亮色";
    case "dark":
      return "主题：暗色";
    case "system":
    default:
      return "主题：跟随系统";
  }
});

const handleAboutClick = () => {
  router.push("/about");
};
</script>

<template>
  <n-layout-footer
    bordered
    style="height: 64px; display: flex; justify-content: center; align-items: center; gap: 16px"
  >
    <n-button quaternary circle @click="handleThemeToggle" :title="themeTitle">
      <template #icon>
        <n-icon :component="themeIcon" />
      </template>
    </n-button>
    <n-button quaternary circle @click="handleAboutClick" title="关于">
      <template #icon>
        <n-icon :component="InformationCircleOutline" />
      </template>
    </n-button>
  </n-layout-footer>
</template>
