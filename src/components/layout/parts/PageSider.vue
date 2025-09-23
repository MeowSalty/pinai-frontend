<script setup lang="ts">
import { h, watch, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { NIcon, type MenuOption } from "naive-ui";
import { Cloud } from "@vicons/ionicons5";
import { DashboardFilled } from "@vicons/material";
import { List } from "@vicons/ionicons5";

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) });
}

const route = useRoute();

// 输出当前路由路径的关键部分
const routeKey = ref(route.path.replace("/", "") || "dashboard");

// 监听路由变化并输出
watch(
  () => route.path,
  (newPath) => {
    routeKey.value = newPath.replace("/", "") || "dashboard";
  }
);

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
    label: () => h(RouterLink, { to: { path: "/logs" } }, { default: () => "使用日志" }),
    key: "logs",
    icon: renderIcon(List),
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
    <n-menu
      :collapsed-width="64"
      :collapsed-icon-size="22"
      :options="menuOptions"
      :value="routeKey"
    />
  </n-layout-sider>
</template>
