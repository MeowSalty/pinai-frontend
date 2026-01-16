<script setup lang="ts">
import type { ModelHealthItem } from "@/types/health";
import type { HealthPaginationState } from "@/composables/useHealthState";
import { createModelColumns } from "@/components/health/columns/healthColumns";

interface Props {
  modelHealthList: ModelHealthItem[];
  loading: boolean;
  pagination: HealthPaginationState;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  enableModel: [modelId: number];
  pageChange: [page: number];
  pageSizeChange: [pageSize: number];
}>();

const modelColumns = createModelColumns({
  onEnableModel: (modelId) => emit("enableModel", modelId),
});
</script>

<template>
  <n-spin :show="props.loading">
    <n-data-table
      :columns="modelColumns"
      :data="props.modelHealthList"
      :pagination="props.pagination"
      :remote="true"
      :loading="props.loading"
      @update:page="(page: number) => emit('pageChange', page)"
      @update:page-size="(pageSize: number) => emit('pageSizeChange', pageSize)"
    />
  </n-spin>
</template>
