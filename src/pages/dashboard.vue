<script setup lang="ts">
defineOptions({
  name: "DashboardPage",
});
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useMessage } from "naive-ui";
import { formatTokens } from "@/utils/numberUtils";
import {
  getStatsOverview,
  getRealtimeStats,
  getModelCallRank,
  getPlatformCallRank,
  getModelUsageRank,
  getPlatformUsageRank,
} from "@/services/statsApi";
import type {
  StatsOverview,
  RealtimeStats,
  ModelCallRankResponse,
  PlatformCallRankResponse,
  ModelCallRankItem,
  PlatformCallRankItem,
  ModelUsageRankResponse,
  PlatformUsageRankResponse,
  ModelUsageRankItem,
  PlatformUsageRankItem,
} from "@/types/stats";
import { handleApiError } from "@/utils/errorHandler";
import { convertMicroseconds } from "@/utils/timeUtils";

const message = useMessage();

// 统计数据
const stats = ref<StatsOverview | null>(null);
const loading = ref<boolean>(false);
const realtimeLoading = ref<boolean>(false);
const realtimeStats = ref<RealtimeStats | null>(null);
const modelCallRank = ref<ModelCallRankResponse | null>(null);
const platformCallRank = ref<PlatformCallRankResponse | null>(null);
const modelUsageRank = ref<ModelUsageRankResponse | null>(null);
const platformUsageRank = ref<PlatformUsageRankResponse | null>(null);
const modelCallRankLoading = ref<boolean>(false);
const platformCallRankLoading = ref<boolean>(false);
const modelUsageRankLoading = ref<boolean>(false);
const platformUsageRankLoading = ref<boolean>(false);

// 时间范围选项
const timeRangeOptions = [
  { label: "24 小时", value: "24h" },
  { label: "7 天", value: "168h" },
];
const selectedTimeRange = ref("24h");
const selectedModelCallRankTimeRange = ref("24h");
const selectedPlatformCallRankTimeRange = ref("24h");
const selectedModelUsageRankTimeRange = ref("24h");
const selectedPlatformUsageRankTimeRange = ref("24h");

// 定时器
let refreshTimer: number | null = null;

// 获取统计数据（统计概览）
const fetchStats = async () => {
  try {
    loading.value = true;
    stats.value = await getStatsOverview(selectedTimeRange.value);
  } catch (error) {
    message.error(handleApiError(error, "获取统计数据"));
  } finally {
    loading.value = false;
  }
};

// 获取模型调用排行数据
const fetchModelCallRank = async () => {
  try {
    modelCallRankLoading.value = true;
    modelCallRank.value = await getModelCallRank(selectedModelCallRankTimeRange.value);
  } catch (error) {
    message.error(handleApiError(error, "获取模型调用排行数据"));
  } finally {
    modelCallRankLoading.value = false;
  }
};

// 获取平台调用排行数据
const fetchPlatformCallRank = async () => {
  try {
    platformCallRankLoading.value = true;
    platformCallRank.value = await getPlatformCallRank(selectedPlatformCallRankTimeRange.value);
  } catch (error) {
    message.error(handleApiError(error, "获取平台调用排行数据"));
  } finally {
    platformCallRankLoading.value = false;
  }
};

// 获取模型用量排行数据
const fetchModelUsageRank = async () => {
  try {
    modelUsageRankLoading.value = true;
    modelUsageRank.value = await getModelUsageRank(selectedModelUsageRankTimeRange.value);
  } catch (error) {
    message.error(handleApiError(error, "获取模型用量排行数据"));
  } finally {
    modelUsageRankLoading.value = false;
  }
};

// 获取平台用量排行数据
const fetchPlatformUsageRank = async () => {
  try {
    platformUsageRankLoading.value = true;
    platformUsageRank.value = await getPlatformUsageRank(selectedPlatformUsageRankTimeRange.value);
  } catch (error) {
    message.error(handleApiError(error, "获取平台用量排行数据"));
  } finally {
    platformUsageRankLoading.value = false;
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
  fetchStats();
};

const handleModelRankTimeRangeChange = (value: string) => {
  selectedModelCallRankTimeRange.value = value;
  fetchModelCallRank();
};

const handlePlatformRankTimeRangeChange = (value: string) => {
  selectedPlatformCallRankTimeRange.value = value;
  fetchPlatformCallRank();
};

const handleModelUsageRankTimeRangeChange = (value: string) => {
  selectedModelUsageRankTimeRange.value = value;
  fetchModelUsageRank();
};

const handlePlatformUsageRankTimeRangeChange = (value: string) => {
  selectedPlatformUsageRankTimeRange.value = value;
  fetchPlatformUsageRank();
};

// 计算转换后的平均首字时间
const avgFirstByteDisplay = computed(() => {
  if (!stats.value?.avg_first_byte) {
    return { value: 0, unit: "μs", formatted: "0 μs" };
  }
  return convertMicroseconds(stats.value.avg_first_byte);
});

// 手动刷新统计概览数据
const handleRefreshStats = () => {
  fetchStats();
};

const handleRefreshModelRank = () => {
  fetchModelCallRank();
};

const handleRefreshPlatformRank = () => {
  fetchPlatformCallRank();
};

const handleRefreshModelUsageRank = () => {
  fetchModelUsageRank();
};

const handleRefreshPlatformUsageRank = () => {
  fetchPlatformUsageRank();
};

onMounted(() => {
  fetchStats(); // 初始获取统计概览数据
  fetchRealtimeStats(); // 初始获取实时状态数据
  fetchModelCallRank(); // 初始获取模型调用排行数据
  fetchPlatformCallRank(); // 初始获取平台调用排行数据
  fetchModelUsageRank(); // 初始获取模型用量排行数据
  fetchPlatformUsageRank(); // 初始获取平台用量排行数据

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
            <n-button type="primary" size="small" :loading="loading" @click="handleRefreshStats">
              刷新
            </n-button>
          </div>
        </div>
      </template>
      <n-spin :show="loading">
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
            <div class="card-header">
              <span>模型调用排行</span>
              <div style="display: flex; gap: 8px; align-items: center">
                <n-select
                  v-model:value="selectedModelCallRankTimeRange"
                  :options="timeRangeOptions"
                  :consistent-menu-width="false"
                  style="width: 120px"
                  @update:value="handleModelRankTimeRangeChange"
                />
                <n-button
                  type="primary"
                  size="small"
                  :loading="modelCallRankLoading"
                  @click="handleRefreshModelRank"
                >
                  刷新
                </n-button>
              </div>
            </div>
          </template>
          <n-spin :show="modelCallRankLoading">
            <n-data-table
              :columns="[
                { title: '模型', key: 'model_name' },
                { title: '请求数', key: 'request_count' },
                { title: '成功率', key: 'success_rate', render: (row: ModelCallRankItem) => `${(row.success_rate * 100).toFixed(2)}%` },
                { title: '占比', key: 'percentage', render: (row: ModelCallRankItem) => `${(row.percentage * 100).toFixed(2)}%` },
              ]"
              :data="modelCallRank?.models"
              :pagination="false"
              :bordered="false"
            />
          </n-spin>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <template #header>
            <div class="card-header">
              <span>模型用量排行</span>
              <div style="display: flex; gap: 8px; align-items: center">
                <n-select
                  v-model:value="selectedModelUsageRankTimeRange"
                  :options="timeRangeOptions"
                  :consistent-menu-width="false"
                  style="width: 120px"
                  @update:value="handleModelUsageRankTimeRangeChange"
                />
                <n-button
                  type="primary"
                  size="small"
                  :loading="modelUsageRankLoading"
                  @click="handleRefreshModelUsageRank"
                >
                  刷新
                </n-button>
              </div>
            </div>
          </template>
          <n-spin :show="modelUsageRankLoading">
            <n-data-table
              :columns="[
                { title: '模型', key: 'model_name' },
                { title: '输入', key: 'prompt_tokens', render: (row: ModelUsageRankItem) => formatTokens(row.prompt_tokens) },
                { title: '输出', key: 'completion_tokens', render: (row: ModelUsageRankItem) => formatTokens(row.completion_tokens) },
                { title: '总计', key: 'total_tokens', render: (row: ModelUsageRankItem) => formatTokens(row.total_tokens) },
                { title: '占比', key: 'percentage', render: (row: ModelUsageRankItem) => `${(row.percentage * 100).toFixed(2)}%` },
              ]"
              :data="modelUsageRank?.models"
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
            <div class="card-header">
              <span>平台调用排行</span>
              <div style="display: flex; gap: 8px; align-items: center">
                <n-select
                  v-model:value="selectedPlatformCallRankTimeRange"
                  :options="timeRangeOptions"
                  :consistent-menu-width="false"
                  style="width: 120px"
                  @update:value="handlePlatformRankTimeRangeChange"
                />
                <n-button
                  type="primary"
                  size="small"
                  :loading="platformCallRankLoading"
                  @click="handleRefreshPlatformRank"
                >
                  刷新
                </n-button>
              </div>
            </div>
          </template>
          <n-spin :show="platformCallRankLoading">
            <n-data-table
              :columns="[
                { title: '平台', key: 'platform_name' },
                { title: '请求数', key: 'request_count' },
                { title: '成功率', key: 'success_rate', render: (row: PlatformCallRankItem) => `${(row.success_rate * 100).toFixed(2)}%` },
                { title: '占比', key: 'percentage', render: (row: PlatformCallRankItem) => `${(row.percentage * 100).toFixed(2)}%` },
              ]"
              :data="platformCallRank?.platforms"
              :pagination="false"
              :bordered="false"
            />
          </n-spin>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <template #header>
            <div class="card-header">
              <span>平台用量排行</span>
              <div style="display: flex; gap: 8px; align-items: center">
                <n-select
                  v-model:value="selectedPlatformUsageRankTimeRange"
                  :options="timeRangeOptions"
                  :consistent-menu-width="false"
                  style="width: 120px"
                  @update:value="handlePlatformUsageRankTimeRangeChange"
                />
                <n-button
                  type="primary"
                  size="small"
                  :loading="platformUsageRankLoading"
                  @click="handleRefreshPlatformUsageRank"
                >
                  刷新
                </n-button>
              </div>
            </div>
          </template>
          <n-spin :show="platformUsageRankLoading">
            <n-data-table
              :columns="[
            { title: '平台', key: 'platform_name' },
            { title: '输入', key: 'prompt_tokens', render: (row: PlatformUsageRankItem) => formatTokens(row.prompt_tokens) },
            { title: '输出', key: 'completion_tokens', render: (row: PlatformUsageRankItem) => formatTokens(row.completion_tokens) },
            { title: '总计', key: 'total_tokens', render: (row: PlatformUsageRankItem) => formatTokens(row.total_tokens) },
            { title: '占比', key: 'percentage', render: (row: PlatformUsageRankItem) => `${(row.percentage * 100).toFixed(2)}%` },
          ]"
              :data="platformUsageRank?.platforms"
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
