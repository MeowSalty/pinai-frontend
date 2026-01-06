<script setup lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();

// 面包屑导航
const breadcrumbs = computed(() => {
  const items = [{ label: "首页", path: "/dashboard" }];

  const matchedRoutes = route.matched.filter(
    (r) => r.path !== "/" && r.path !== "" && r.meta?.title
  );

  for (const routeRecord of matchedRoutes) {
    const title = routeRecord.meta.title as string;
    if (title !== "首页" && title !== "仪表盘") {
      const isDuplicate = items.some((item) => item.label === title);
      if (!isDuplicate) {
        items.push({ label: title, path: routeRecord.path });
      }
    }
  }

  return items;
});
</script>

<template>
  <n-page-header>
    <template #header>
      <n-breadcrumb>
        <n-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="index">
          <router-link
            v-if="index < breadcrumbs.length - 1"
            :to="item.path"
            class="breadcrumb-link"
          >
            {{ item.label }}
          </router-link>
          <span v-else>{{ item.label }}</span>
        </n-breadcrumb-item>
      </n-breadcrumb>
    </template>
  </n-page-header>
</template>
