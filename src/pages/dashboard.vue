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
import TrendChart from "@/components/dashboard/TrendChart.vue";
import type {
  StatsOverview,
  RealtimeStats,
  ModelCallRankItem,
  PlatformCallRankItem,
  ModelUsageRankItem,
  PlatformUsageRankItem,
  TrendResponse,
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
const trendData = ref<TrendResponse | null>(null);
const trendMetric = ref<"request_count" | "total_tokens">("request_count");

// 排行切换维度
const rankEntity = ref<"model" | "platform">("model");
const rankMetric = ref<"call" | "usage">("call");

const rankTableData = computed(() => {
  if (rankEntity.value === "model" && rankMetric.value === "call") {
    return modelCallRank.value;
  }
  if (rankEntity.value === "model" && rankMetric.value === "usage") {
    return modelUsageRank.value;
  }
  if (rankEntity.value === "platform" && rankMetric.value === "call") {
    return platformCallRank.value;
  }
  if (rankEntity.value === "platform" && rankMetric.value === "usage") {
    return platformUsageRank.value;
  }
  return [];
});

const rankTableColumns = computed(() => {
  const isModel = rankEntity.value === "model";
  const nameColumn = {
    title: isModel ? "模型" : "平台",
    key: isModel ? "model_name" : "platform_name",
  };

  if (rankMetric.value === "call") {
    return [
      nameColumn,
      { title: "请求", key: "request_count", minWidth: 70 },
      {
        title: "成功率",
        key: "success_rate",
        render: (row: { success_rate: number }) => `${(row.success_rate * 100).toFixed(2)}%`,
        minWidth: 80,
      },
      {
        title: "占比",
        key: "percentage",
        render: (row: { percentage: number }) => `${(row.percentage * 100).toFixed(2)}%`,
        minWidth: 80,
      },
    ];
  }

  return [
    nameColumn,
    {
      title: "输入",
      key: "prompt_tokens",
      render: (row: { prompt_tokens: number }) => formatTokens(row.prompt_tokens),
      minWidth: 70,
    },
    {
      title: "输出",
      key: "completion_tokens",
      render: (row: { completion_tokens: number }) => formatTokens(row.completion_tokens),
      minWidth: 70,
    },
    {
      title: "总计",
      key: "total_tokens",
      render: (row: { total_tokens: number }) => formatTokens(row.total_tokens),
      minWidth: 70,
    },
    {
      title: "占比",
      key: "percentage",
      render: (row: { percentage: number }) => `${(row.percentage * 100).toFixed(2)}%`,
      minWidth: 80,
    },
  ];
});

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
    trendData.value = response.trend || null;
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
  if (stats.value?.avg_first_byte == null) {
    return { value: null, unit: "μs" };
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
            <n-statistic label="总请求数" :value="stats?.total_requests ?? '-'" />
          </n-gi>
          <n-gi>
            <n-statistic
              label="成功率"
              :value="
                stats?.success_rate != null ? (stats.success_rate * 100).toFixed(2) + '%' : '-'
              "
            />
          </n-gi>
          <n-gi>
            <n-statistic
              :label="`平均首字时间(${avgFirstByteDisplay.unit})`"
              :value="
                avgFirstByteDisplay.value != null ? avgFirstByteDisplay.value.toFixed(2) : '-'
              "
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

    <n-card style="margin-top: 20px">
      <template #header>
        <div class="card-header card-header-wrap">
          <span>趋势分析</span>
          <n-radio-group v-model:value="trendMetric" size="small">
            <n-radio-button value="request_count">请求量</n-radio-button>
            <n-radio-button value="total_tokens">Token 用量</n-radio-button>
          </n-radio-group>
        </div>
      </template>
      <n-spin :show="dashboardLoading">
        <n-empty
          v-if="!trendData || trendData.data_points.length === 0"
          description="暂无趋势数据"
        />
        <TrendChart
          v-else
          :data="trendData.data_points"
          :data-key="trendMetric"
          :granularity="trendData.granularity"
          :loading="dashboardLoading"
        />
      </n-spin>
    </n-card>

    <n-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>排行分析</span>
          <div style="display: flex; gap: 16px; align-items: center">
            <n-radio-group v-model:value="rankEntity" size="small">
              <n-radio-button value="model">模型</n-radio-button>
              <n-radio-button value="platform">平台</n-radio-button>
            </n-radio-group>
            <n-radio-group v-model:value="rankMetric" size="small">
              <n-radio-button value="call">调用量</n-radio-button>
              <n-radio-button value="usage">Token用量</n-radio-button>
            </n-radio-group>
          </div>
        </div>
      </template>
      <n-spin :show="dashboardLoading">
        <n-data-table
          :columns="rankTableColumns"
          :data="rankTableData"
          :pagination="false"
          :bordered="false"
        />
      </n-spin>
    </n-card>
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

.card-header-wrap {
  gap: 12px;
  flex-wrap: wrap;
}
</style>
