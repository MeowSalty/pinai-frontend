<script setup lang="ts">
import type { PlatformHealthItem } from "@/types/health";
import type { HealthPaginationState } from "@/composables/useHealthState";
import { createPlatformColumns } from "@/components/health/columns/healthColumns";

interface Props {
  platformHealthList: PlatformHealthItem[];
  loading: boolean;
  pagination: HealthPaginationState;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  enablePlatform: [platformId: number];
  pageChange: [page: number];
  pageSizeChange: [pageSize: number];
}>();

const platformColumns = createPlatformColumns({
  onEnablePlatform: (platformId) => emit("enablePlatform", platformId),
});
</script>

<template>
  <n-spin :show="props.loading">
    <n-data-table
      :columns="platformColumns"
      :data="props.platformHealthList"
      :pagination="props.pagination"
      :remote="true"
      :loading="props.loading"
      @update:page="(page: number) => emit('pageChange', page)"
      @update:page-size="(pageSize: number) => emit('pageSizeChange', pageSize)"
    />
  </n-spin>
</template>
