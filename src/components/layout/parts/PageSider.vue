<script setup lang="ts">
import { h } from "vue";
import { RouterLink } from "vue-router";
import type { MenuOption } from "naive-ui";

const menuOptions: MenuOption[] = [
  {
    label: () => h(RouterLink, { to: { path: "/overview" } }, { default: () => "概览" }),
    key: "dashboard",
  },
  {
    label: () => h(RouterLink, { to: { path: "/supplier" } }, { default: () => "供应商管理" }),
    key: "supplier",
  },
  {
    label: () => h(RouterLink, { to: { path: "/system" } }, { default: () => "系统设置" }),
    key: "system",
  },
];
</script>

<template>
  <n-layout-sider
    bordered
    show-trigger
    collapse-mode="width"
    :collapsed-width="64"
    :width="240"
    :native-scrollbar="false"
  >
    <n-menu :collapsed-width="64" :collapsed-icon-size="22" :options="menuOptions" />
  </n-layout-sider>
</template>
