<script setup lang="ts">
import { zhCN, dateZhCN, darkTheme, lightTheme } from "naive-ui";
import { useThemeStore } from "@/stores/themeStore";

const themeStore = useThemeStore();
</script>

<template>
  <n-config-provider
    :locale="zhCN"
    :date-locale="dateZhCN"
    :theme="themeStore.isDark ? darkTheme : lightTheme"
  >
    <n-dialog-provider>
      <n-message-provider>
        <MainLayout style="height: 100vh" />
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>
