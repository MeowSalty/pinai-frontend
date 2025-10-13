<script setup lang="ts">
defineOptions({
  name: "DashboardPage",
});
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useMessage } from "naive-ui";
import {
  getStatsOverview,
  getRealtimeStats,
  getModelRank,
  getPlatformRank,
} from "@/services/statsApi";
import type {
  StatsOverview,
  RealtimeStats,
  ModelRankResponse,
  PlatformRankResponse,
  ModelRankItem,
  PlatformRankItem,
} from "@/types/stats";
import { handleApiError } from "@/utils/errorHandler";
import { convertMicroseconds } from "@/utils/timeUtils";

const message = useMessage();

// 统计数据
const stats = ref<StatsOverview | null>(null);
const loading = ref<boolean>(false);
const realtimeLoading = ref<boolean>(false);
const realtimeStats = ref<RealtimeStats | null>(null);
const modelRank = ref<ModelRankResponse | null>(null);
const platformRank = ref<PlatformRankResponse | null>(null);
const modelRankLoading = ref<boolean>(false);
const platformRankLoading = ref<boolean>(false);

// 时间范围选项
const timeRangeOptions = [
  { label: "24 小时", value: "24h" },
  { label: "7 天", value: "168h" },
];
const selectedTimeRange = ref("24h");
const selectedModelRankTimeRange = ref("24h");
const selectedPlatformRankTimeRange = ref("24h");

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

// 获取模型排行数据
const fetchModelRank = async () => {
  try {
    modelRankLoading.value = true;
    modelRank.value = await getModelRank(selectedModelRankTimeRange.value);
  } catch (error) {
    message.error(handleApiError(error, "获取模型排行数据"));
  } finally {
    modelRankLoading.value = false;
  }
};

// 获取平台排行数据
const fetchPlatformRank = async () => {
  try {
    platformRankLoading.value = true;
    platformRank.value = await getPlatformRank(selectedPlatformRankTimeRange.value);
  } catch (error) {
    message.error(handleApiError(error, "获取平台排行数据"));
  } finally {
    platformRankLoading.value = false;
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
  selectedModelRankTimeRange.value = value;
  fetchModelRank();
};

const handlePlatformRankTimeRangeChange = (value: string) => {
  selectedPlatformRankTimeRange.value = value;
  fetchPlatformRank();
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
  fetchModelRank();
};

const handleRefreshPlatformRank = () => {
  fetchPlatformRank();
};

onMounted(() => {
  fetchStats(); // 初始获取统计概览数据
  fetchRealtimeStats(); // 初始获取实时状态数据
  fetchModelRank(); // 初始获取模型排行数据
  fetchPlatformRank(); // 初始获取平台排行数据

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
        <n-grid cols="1 s:2 m:3" responsive="screen" :x-gap="12" :y-gap="12">
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
                  v-model:value="selectedModelRankTimeRange"
                  :options="timeRangeOptions"
                  :consistent-menu-width="false"
                  style="width: 120px"
                  @update:value="handleModelRankTimeRangeChange"
                />
                <n-button
                  type="primary"
                  size="small"
                  :loading="modelRankLoading"
                  @click="handleRefreshModelRank"
                >
                  刷新
                </n-button>
              </div>
            </div>
          </template>
          <n-spin :show="modelRankLoading">
            <n-data-table
              :columns="[
                { title: '模型', key: 'model_name' },
                { title: '请求数', key: 'request_count' },
                { title: '成功率', key: 'success_rate', render: (row: ModelRankItem) => `${(row.success_rate * 100).toFixed(2)}%` },
                { title: '占比', key: 'percentage', render: (row: ModelRankItem) => `${(row.percentage * 100).toFixed(2)}%` },
              ]"
              :data="modelRank?.models"
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
              <span>平台调用排行</span>
              <div style="display: flex; gap: 8px; align-items: center">
                <n-select
                  v-model:value="selectedPlatformRankTimeRange"
                  :options="timeRangeOptions"
                  :consistent-menu-width="false"
                  style="width: 120px"
                  @update:value="handlePlatformRankTimeRangeChange"
                />
                <n-button
                  type="primary"
                  size="small"
                  :loading="platformRankLoading"
                  @click="handleRefreshPlatformRank"
                >
                  刷新
                </n-button>
              </div>
            </div>
          </template>
          <n-spin :show="platformRankLoading">
            <n-data-table
              :columns="[
                { title: '平台', key: 'platform_name' },
                { title: '请求数', key: 'request_count' },
                { title: '成功率', key: 'success_rate', render: (row: PlatformRankItem) => `${(row.success_rate * 100).toFixed(2)}%` },
                { title: '占比', key: 'percentage', render: (row: PlatformRankItem) => `${(row.percentage * 100).toFixed(2)}%` },
              ]"
              :data="platformRank?.platforms"
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
