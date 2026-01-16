<script setup lang="ts">
import SegmentedProgress from "@/components/common/SegmentedProgress.vue";
import type { HealthIssueItem, HealthSummary } from "@/types/health";
import type { HealthSegment } from "@/composables/useHealthState";
import { createIssueColumns } from "@/components/health/columns/healthColumns";

interface Props {
  healthData: HealthSummary | null;
  platformSegments: HealthSegment[];
  apiKeySegments: HealthSegment[];
  modelSegments: HealthSegment[];
  issuesList: HealthIssueItem[];
  issuesLoading: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  recoverIssue: [item: HealthIssueItem];
}>();

const issueColumns = createIssueColumns({
  onRecoverIssue: (item) => emit("recoverIssue", item),
});
</script>

<template>
  <n-grid cols="1 s:2 m:3" responsive="screen" :x-gap="12" :y-gap="12">
    <n-gi>
      <n-card title="平台" :bordered="true">
        <SegmentedProgress
          :segments="props.platformSegments"
          :total="props.healthData?.platform.total"
          :height="14"
        />
      </n-card>
    </n-gi>

    <n-gi>
      <n-card title="密钥" :bordered="true">
        <SegmentedProgress
          :segments="props.apiKeySegments"
          :total="props.healthData?.api_key.total"
          :height="14"
        />
      </n-card>
    </n-gi>

    <n-gi>
      <n-card title="模型" :bordered="true">
        <SegmentedProgress
          :segments="props.modelSegments"
          :total="props.healthData?.model.total"
          :height="14"
        />
      </n-card>
    </n-gi>
  </n-grid>

  <n-card title="活跃问题" :bordered="true" style="margin-top: 12px">
    <n-spin :show="props.issuesLoading">
      <div v-if="props.issuesList.length === 0" style="text-align: center; padding: 20px">
        <n-empty description="暂无活跃问题" />
      </div>
      <n-data-table v-else :columns="issueColumns" :data="props.issuesList" :bordered="false" />
    </n-spin>
  </n-card>
</template>
