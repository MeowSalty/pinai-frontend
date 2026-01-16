<script setup lang="ts">
import type { ApiKeyHealthItem } from "@/types/health";
import type { HealthPaginationState } from "@/composables/useHealthState";
import { createApiKeyColumns } from "@/components/health/columns/healthColumns";

interface Props {
  apiKeyHealthList: ApiKeyHealthItem[];
  loading: boolean;
  pagination: HealthPaginationState;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  enableApiKey: [keyId: number];
  pageChange: [page: number];
  pageSizeChange: [pageSize: number];
}>();

const apiKeyColumns = createApiKeyColumns({
  onEnableApiKey: (keyId) => emit("enableApiKey", keyId),
});
</script>

<template>
  <n-spin :show="props.loading">
    <n-data-table
      :columns="apiKeyColumns"
      :data="props.apiKeyHealthList"
      :pagination="props.pagination"
      :remote="true"
      :loading="props.loading"
      @update:page="(page: number) => emit('pageChange', page)"
      @update:page-size="(pageSize: number) => emit('pageSizeChange', pageSize)"
    />
  </n-spin>
</template>
