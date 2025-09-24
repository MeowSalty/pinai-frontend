<script setup lang="ts">
defineOptions({
  name: "DashboardPage",
});
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useMessage } from "naive-ui";
import { getStatsOverview } from "@/services/statsApi";
import type { StatsOverview } from "@/types/stats";
import { handleApiError } from "@/utils/errorHandler";
import { convertMicroseconds } from "@/utils/timeUtils";

const message = useMessage();

// 统计数据
const stats = ref<StatsOverview | null>(null);
const loading = ref<boolean>(false);

// 定时器
let refreshTimer: number | null = null;

// 获取统计数据
const fetchStats = async () => {
  try {
    loading.value = true;
    stats.value = await getStatsOverview();
  } catch (error) {
    message.error(handleApiError(error, "获取统计数据"));
  } finally {
    loading.value = false;
  }
};

// 计算转换后的平均首字时间
const avgFirstByteDisplay = computed(() => {
  if (!stats.value?.avg_first_byte) {
    return { value: 0, unit: "μs", formatted: "0 μs" };
  }
  return convertMicroseconds(stats.value.avg_first_byte);
});

// 开始自动刷新
const startAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  refreshTimer = window.setInterval(fetchStats, 5000);
};

// 停止自动刷新
const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};

onMounted(() => {
  fetchStats();
  startAutoRefresh();
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<template>
  <div>
    <n-card title="统计概览">
      <n-spin :show="loading">
        <n-grid cols="1 s:2 m:3 l:4" responsive="screen" :x-gap="12" :y-gap="12">
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
            <n-statistic label="每分钟请求数(RPM)" :value="stats?.rpm || 0" />
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
</style>
