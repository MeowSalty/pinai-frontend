<script setup lang="ts">
import { h } from "vue";
import { RouterLink } from "vue-router";
import { NIcon, type MenuOption } from "naive-ui";
import { Cloud, Settings } from "@vicons/ionicons5";
import { DashboardFilled } from "@vicons/material";

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) });
}

const menuOptions: MenuOption[] = [
  {
    label: () => h(RouterLink, { to: { path: "/dashboard" } }, { default: () => "仪表盘" }),
    key: "dashboard",
    icon: renderIcon(DashboardFilled),
  },
  {
    label: () => h(RouterLink, { to: { path: "/provider" } }, { default: () => "供应商" }),
    key: "provider",
    icon: renderIcon(Cloud),
  },
  {
    label: () => h(RouterLink, { to: { path: "/system" } }, { default: () => "系统设置" }),
    key: "system",
    icon: renderIcon(Settings),
  },
];
</script>

<template>
  <n-layout-sider
    bordered
    show-trigger
    collapse-mode="width"
    :collapsed-width="64"
    :width="140"
    :native-scrollbar="false"
  >
    <n-menu :collapsed-width="64" :collapsed-icon-size="22" :options="menuOptions" />
  </n-layout-sider>
</template>
