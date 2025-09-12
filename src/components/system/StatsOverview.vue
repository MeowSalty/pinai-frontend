<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useMessage } from "naive-ui";
import { getStatsOverview } from "@/services/statsApi";
import type { StatsOverview } from "@/types/stats";

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
    console.error("获取统计概览失败：", error);
    message.error("获取统计概览失败：" + (error as Error).message);
  } finally {
    loading.value = false;
  }
};

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
            <n-statistic label="平均首字时间(ms)" :value="stats?.avg_first_byte?.toFixed(2) || 0" />
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
