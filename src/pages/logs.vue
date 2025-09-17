<script setup lang="ts">
defineOptions({
  name: "LogsPage",
});
import { ref, onMounted, h } from "vue";
import { listRequestStats } from "@/services/statsApi";
import type { RequestStat, ListRequestStatsOptions } from "@/types/stats";
import { useMessage, NTime } from "naive-ui";

// 分页相关
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
});

// 筛选条件
const filters = ref({
  startTime: null as string | null,
  endTime: null as string | null,
  success: null as boolean | null,
  requestType: null as string | null,
  modelName: null as string | null,
});

// 数据列表
const logs = ref<RequestStat[]>([]);
const loading = ref(false);
const message = useMessage();

// 请求类型选项
const requestTypeOptions = [
  { label: "流式请求", value: "stream" },
  { label: "非流式请求", value: "non-stream" },
];

// 状态选项
const statusOptions = [
  { label: "成功", value: true },
  { label: "失败", value: false },
];

// 加载数据
async function loadLogs() {
  loading.value = true;
  try {
    const options: ListRequestStatsOptions = {
      page: pagination.value.page,
      page_size: pagination.value.pageSize,
    };

    // 添加筛选条件
    if (filters.value.startTime) {
      options.start_time = filters.value.startTime;
    }
    if (filters.value.endTime) {
      options.end_time = filters.value.endTime;
    }
    if (filters.value.success !== null) {
      options.success = filters.value.success;
    }
    if (filters.value.requestType) {
      options.request_type = filters.value.requestType;
    }
    if (filters.value.modelName) {
      options.model_name = filters.value.modelName;
    }

    const response = await listRequestStats(options);
    // 按时间倒序排列，最新的在上方
    logs.value = response.data.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    pagination.value.total = response.count;
  } catch (error) {
    console.error("获取请求日志失败：", error);
    message.error("获取请求日志失败");
  } finally {
    loading.value = false;
  }
}

// 重置筛选条件
function resetFilters() {
  filters.value = {
    startTime: null,
    endTime: null,
    success: null,
    requestType: null,
    modelName: null,
  };
  handleSearch();
}

// 搜索
function handleSearch() {
  pagination.value.page = 1;
  loadLogs();
}

// 分页变化
function handlePageChange(page: number) {
  pagination.value.page = page;
  loadLogs();
}

// 分页大小变化
function handlePageSizeChange(pageSize: number) {
  pagination.value.pageSize = pageSize;
  pagination.value.page = 1;
  loadLogs();
}

// 格式化耗时显示（处理纳秒单位）
function formatDuration(durationNs: number): string {
  // 将纳秒转换为合适的单位
  if (durationNs < 1000) {
    // 纳秒级
    return `${durationNs}ns`;
  } else if (durationNs < 1000000) {
    // 微秒级
    return `${(durationNs / 1000).toFixed(2)}μs`;
  } else if (durationNs < 1000000000) {
    // 毫秒级
    return `${(durationNs / 1000000).toFixed(2)}ms`;
  } else if (durationNs < 60000000000) {
    // 秒级
    return `${(durationNs / 1000000000).toFixed(2)}s`;
  } else {
    // 分钟级
    return `${(durationNs / 60000000000).toFixed(2)}min`;
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadLogs();
});
</script>

<template>
  <n-space vertical>
    <n-card title="筛选条件">
      <n-form label-placement="left" label-width="auto">
        <n-grid :cols="3" :x-gap="12" :y-gap="12" responsive="screen">
          <n-form-item-gi label="状态">
            <n-select
              v-model:value="filters.success"
              :options="statusOptions"
              clearable
              placeholder="请选择状态"
            />
          </n-form-item-gi>
          <n-form-item-gi label="请求类型">
            <n-select
              v-model:value="filters.requestType"
              :options="requestTypeOptions"
              clearable
              placeholder="请选择请求类型"
            />
          </n-form-item-gi>
          <n-form-item-gi label="模型名称">
            <n-input v-model:value="filters.modelName" clearable placeholder="请输入模型名称" />
          </n-form-item-gi>
          <n-gi :span="2">
            <n-form-item label="时间范围" label-placement="left">
              <n-space>
                <n-date-picker
                  v-model:value="filters.startTime"
                  type="datetime"
                  clearable
                  placeholder="开始时间"
                />
                <span>至</span>
                <n-date-picker
                  v-model:value="filters.endTime"
                  type="datetime"
                  clearable
                  placeholder="结束时间"
                />
              </n-space>
            </n-form-item>
          </n-gi>
          <n-form-item-gi :span="3">
            <n-space justify="end">
              <n-button type="primary" @click="handleSearch">搜索</n-button>
              <n-button @click="resetFilters">重置</n-button>
            </n-space>
          </n-form-item-gi>
        </n-grid>
      </n-form>
    </n-card>

    <n-card title="请求日志">
      <n-data-table
        :columns="[
          {
            title: '时间',
            key: 'timestamp',
            width: 165,
            render(row: RequestStat) {
              return h(NTime, {
                time: new Date(row.timestamp),
                format: 'yyyy-MM-dd HH:mm:ss'
              });
            }
          },
          {
            title: '模型名称',
            key: 'model_name',
            ellipsis: {
              tooltip: true
            }
          },
          {
            title: '请求类型',
            key: 'request_type',
            width: 80
          },
          {
            title: '状态',
            key: 'success',
            width: 60,
            render(row: RequestStat) {
              return h('span', { style: { color: row.success ? 'green' : 'red' } }, row.success ? '成功' : '失败');
            }
          },
          {
            title: '耗时',
            key: 'duration',
            render(row: RequestStat) {
              return formatDuration(row.duration);
            }
          },
          {
            title: '首字耗时',
            key: 'first_byte_time',
            render(row: RequestStat) {
              return row.first_byte_time ? formatDuration(row.first_byte_time) : '-';
            }
          },
          {
            title: '错误信息',
            key: 'error_msg',
            ellipsis: {
              tooltip: true
            }
          }
        ]"
        :data="logs"
        :loading="loading"
        :pagination="pagination"
        remote
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </n-card>
  </n-space>
</template>

<style scoped>
.n-form-item {
  margin-right: 20px;
  margin-bottom: 10px;
}
</style>
