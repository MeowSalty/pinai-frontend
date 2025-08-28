<script setup lang="ts">
import PageHeader from "@/components/layout/parts/PageHeader.vue";
import PageSider from "@/components/layout/parts/PageSider.vue";
import PageFooter from "@/components/layout/parts/PageFooter.vue";
</script>

<template>
  <div style="height: 100vh; display: flex; flex-direction: column;">
    <PageHeader />
    <div style="flex: 1; display: flex; overflow: hidden;">
      <PageSider />
      <div style="flex: 1; padding: 24px; overflow: auto;">
        <router-view />
      </div>
    </div>
    <PageFooter />
  </div>
</template>
