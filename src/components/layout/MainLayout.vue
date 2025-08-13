<script setup lang="ts">
import PageHeader from "@/components/layout/parts/PageHeader.vue";
import PageSider from "@/components/layout/parts/PageSider.vue";
import PageFooter from "@/components/layout/parts/PageFooter.vue";
</script>

<template>
  <n-layout style="height: 100vh">
    <PageHeader />
    <n-layout has-sider>
      <PageSider />
      <n-layout-content content-style="padding: 24px;">
        <router-view />
      </n-layout-content>
    </n-layout>
    <PageFooter />
  </n-layout>
</template>
