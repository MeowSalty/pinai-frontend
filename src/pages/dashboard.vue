<script setup lang="ts">
definePage({
  meta: {
    title: "仪表盘",
  },
});
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useMessage } from "naive-ui";
import { formatTokens } from "@/utils/numberUtils";
import { getDashboard, getRealtimeStats } from "@/services/statsApi";
import type {
  StatsOverview,
  RealtimeStats,
  ModelCallRankItem,
  PlatformCallRankItem,
  ModelUsageRankItem,
  PlatformUsageRankItem,
} from "@/types/stats";
import { handleApiError } from "@/utils/errorHandler";
import { convertMicroseconds } from "@/utils/timeUtils";
import { useApiServerCheck } from "@/composables/useApiServerCheck";

const message = useMessage();
const { checkApiServer } = useApiServerCheck();

// 统计数据
const stats = ref<StatsOverview | null>(null);
const dashboardLoading = ref<boolean>(false);
const realtimeLoading = ref<boolean>(false);
const realtimeStats = ref<RealtimeStats | null>(null);
const modelCallRank = ref<ModelCallRankItem[]>([]);
const platformCallRank = ref<PlatformCallRankItem[]>([]);
const modelUsageRank = ref<ModelUsageRankItem[]>([]);
const platformUsageRank = ref<PlatformUsageRankItem[]>([]);

// 时间范围选项
const timeRangeOptions = [
  { label: "24 小时", value: "24h" },
  { label: "7 天", value: "7d" },
  { label: "30 天", value: "30d" },
];
const selectedTimeRange = ref("24h");

// 定时器
let refreshTimer: number | null = null;

// 获取仪表盘数据（统一接口）
const fetchDashboard = async () => {
  try {
    dashboardLoading.value = true;
    const response = await getDashboard(selectedTimeRange.value);

    stats.value = response.overview;
    modelCallRank.value = response.ranks.model_call;
    platformCallRank.value = response.ranks.platform_call;
    modelUsageRank.value = response.ranks.model_usage;
    platformUsageRank.value = response.ranks.platform_usage;
  } catch (error) {
    message.error(handleApiError(error, "获取仪表盘数据"));
  } finally {
    dashboardLoading.value = false;
  }
};

// 获取实时状态数据
const fetchRealtimeStats = async () => {
  try {
    realtimeLoading.value = true;
    const realtimeData = await getRealtimeStats();
    realtimeStats.value = realtimeData;
  } catch (error) {
    console.error("获取实时数据失败：", error);
  } finally {
    realtimeLoading.value = false;
  }
};

// 时间范围改变时重新获取数据
const handleTimeRangeChange = (value: string) => {
  selectedTimeRange.value = value;
  fetchDashboard();
};

// 计算转换后的平均首字时间
const avgFirstByteDisplay = computed(() => {
  if (!stats.value?.avg_first_byte) {
    return { value: 0, unit: "μs", formatted: "0 μs" };
  }
  return convertMicroseconds(stats.value.avg_first_byte);
});

// 手动刷新仪表盘数据
const handleRefreshDashboard = () => {
  fetchDashboard();
};

onMounted(() => {
  // 检查 API 服务器
  if (!checkApiServer()) {
    return;
  }

  // 初始化获取数据
  fetchDashboard();
  fetchRealtimeStats();

  // 设置定时器，每 5 秒获取一次实时数据
  refreshTimer = setInterval(fetchRealtimeStats, 5000);
});

onUnmounted(() => {
  // 清理定时器
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
});
</script>

<template>
  <div>
    <n-card title="实时状态" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>实时状态</span>
        </div>
      </template>
      <n-spin :show="realtimeLoading">
        <n-grid cols="1 s:2 m:3" responsive="screen" :x-gap="12" :y-gap="12">
          <n-gi>
            <n-statistic label="每分钟请求数(RPM)" :value="realtimeStats?.rpm || 0" />
          </n-gi>
          <n-gi>
            <n-statistic label="活动连接数" :value="realtimeStats?.active_connections || 0" />
          </n-gi>
        </n-grid>
      </n-spin>
    </n-card>

    <n-card>
      <template #header>
        <div class="card-header">
          <span>统计概览</span>
          <div style="display: flex; gap: 8px; align-items: center">
            <n-select
              v-model:value="selectedTimeRange"
              :options="timeRangeOptions"
              :consistent-menu-width="false"
              style="width: 120px"
              @update:value="handleTimeRangeChange"
            />
            <n-button
              type="primary"
              size="small"
              :loading="dashboardLoading"
              @click="handleRefreshDashboard"
            >
              刷新
            </n-button>
          </div>
        </div>
      </template>
      <n-spin :show="dashboardLoading">
        <n-grid cols="1 s:2 m:4 l:6" responsive="screen" :x-gap="12" :y-gap="12">
          <n-gi>
            <n-statistic label="总请求数" :value="stats?.total_requests || 0" />
          </n-gi>
          <n-gi>
            <n-statistic
              label="成功率"
              :value="stats?.success_rate ? (stats.success_rate * 100).toFixed(2) + '%' : '0%'"
            />
          </n-gi>
          <n-gi>
            <n-statistic
              :label="`平均首字时间(${avgFirstByteDisplay.unit})`"
              :value="avgFirstByteDisplay.value.toFixed(2)"
            />
          </n-gi>
          <n-gi>
            <n-statistic label="输入Token" :value="formatTokens(stats?.total_prompt_tokens)" />
          </n-gi>
          <n-gi>
            <n-statistic label="输出Token" :value="formatTokens(stats?.total_completion_tokens)" />
          </n-gi>
          <n-gi>
            <n-statistic label="总Token" :value="formatTokens(stats?.total_tokens)" />
          </n-gi>
        </n-grid>
      </n-spin>
    </n-card>

    <n-grid cols="1 s:2" responsive="screen" :x-gap="12" :y-gap="12" style="margin-top: 20px">
      <n-gi>
        <n-card>
          <template #header>
            <span>模型调用排行</span>
          </template>
          <n-spin :show="dashboardLoading">
            <n-data-table
              :columns="[
                { title: '模型', key: 'model_name' },
                { title: '请求', key: 'request_count', minWidth: 70 },
                {
                  title: '成功率',
                  key: 'success_rate',
                  render: (row: ModelCallRankItem) => `${(row.success_rate * 100).toFixed(2)}%`,
                  minWidth: 80,
                },
                {
                  title: '占比',
                  key: 'percentage',
                  render: (row: ModelCallRankItem) => `${(row.percentage * 100).toFixed(2)}%`,
                  minWidth: 80,
                },
              ]"
              :data="modelCallRank"
              :pagination="false"
              :bordered="false"
            />
          </n-spin>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <template #header>
            <span>模型用量排行</span>
          </template>
          <n-spin :show="dashboardLoading">
            <n-data-table
              :columns="[
                { title: '模型', key: 'model_name' },
                {
                  title: '输入',
                  key: 'prompt_tokens',
                  render: (row: ModelUsageRankItem) => formatTokens(row.prompt_tokens),
                  minWidth: 70,
                },
                {
                  title: '输出',
                  key: 'completion_tokens',
                  render: (row: ModelUsageRankItem) => formatTokens(row.completion_tokens),
                  minWidth: 70,
                },
                {
                  title: '总计',
                  key: 'total_tokens',
                  render: (row: ModelUsageRankItem) => formatTokens(row.total_tokens),
                  minWidth: 70,
                },
                {
                  title: '占比',
                  key: 'percentage',
                  render: (row: ModelUsageRankItem) => `${(row.percentage * 100).toFixed(2)}%`,
                  minWidth: 80,
                },
              ]"
              :data="modelUsageRank"
              :pagination="false"
              :bordered="false"
            />
          </n-spin>
        </n-card>
      </n-gi>
    </n-grid>

    <n-grid cols="1 s:2" responsive="screen" :x-gap="12" :y-gap="12" style="margin-top: 20px">
      <n-gi>
        <n-card>
          <template #header>
            <span>平台调用排行</span>
          </template>
          <n-spin :show="dashboardLoading">
            <n-data-table
              :columns="[
                { title: '平台', key: 'platform_name' },
                { title: '请求', key: 'request_count', minWidth: 70 },
                {
                  title: '成功率',
                  key: 'success_rate',
                  render: (row: PlatformCallRankItem) => `${(row.success_rate * 100).toFixed(2)}%`,
                  minWidth: 80,
                },
                {
                  title: '占比',
                  key: 'percentage',
                  render: (row: PlatformCallRankItem) => `${(row.percentage * 100).toFixed(2)}%`,
                  minWidth: 80,
                },
              ]"
              :data="platformCallRank"
              :pagination="false"
              :bordered="false"
            />
          </n-spin>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <template #header>
            <span>平台用量排行</span>
          </template>
          <n-spin :show="dashboardLoading">
            <n-data-table
              :columns="[
                { title: '平台', key: 'platform_name' },
                {
                  title: '输入',
                  key: 'prompt_tokens',
                  render: (row: PlatformUsageRankItem) => formatTokens(row.prompt_tokens),
                  minWidth: 70,
                },
                {
                  title: '输出',
                  key: 'completion_tokens',
                  render: (row: PlatformUsageRankItem) => formatTokens(row.completion_tokens),
                  minWidth: 70,
                },
                {
                  title: '总计',
                  key: 'total_tokens',
                  render: (row: PlatformUsageRankItem) => formatTokens(row.total_tokens),
                  minWidth: 80,
                },
                {
                  title: '占比',
                  key: 'percentage',
                  render: (row: PlatformUsageRankItem) => `${(row.percentage * 100).toFixed(2)}%`,
                  minWidth: 80,
                },
              ]"
              :data="platformUsageRank"
              :pagination="false"
              :bordered="false"
            />
          </n-spin>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<style scoped>
.n-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
