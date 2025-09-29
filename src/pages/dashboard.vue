<script setup lang="ts">
defineOptions({
  name: "DashboardPage",
});
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useMessage } from "naive-ui";
import { getStatsOverview, getRealtimeStats } from "@/services/statsApi";
import type { StatsOverview, RealtimeStats } from "@/types/stats";
import { handleApiError } from "@/utils/errorHandler";
import { convertMicroseconds } from "@/utils/timeUtils";

const message = useMessage();

// 统计数据
const stats = ref<StatsOverview | null>(null);
const loading = ref<boolean>(false);
const realtimeLoading = ref<boolean>(false);
const realtimeStats = ref<RealtimeStats | null>(null);

// 时间范围选项
const timeRangeOptions = [
  { label: "24 小时", value: "24h" },
  { label: "7 天", value: "168h" },
];
const selectedTimeRange = ref("24h");

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

onMounted(() => {
  fetchStats(); // 初始获取统计概览数据
  fetchRealtimeStats(); // 初始获取实时状态数据

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
