<script setup lang="ts">
defineOptions({
  name: "LogsPage",
});
import { ref, onMounted, h, reactive } from "vue";
import { listRequestStats } from "@/services/statsApi";
import { providerApi } from "@/services/providerApi";
import type { RequestStat, ListRequestStatsOptions } from "@/types/stats";
import { useMessage, NTime, NTooltip } from "naive-ui";
import { handleApiError } from "@/utils/errorHandler";
import { convertMicroseconds } from "@/utils/timeUtils";
import { formatTokens } from "@/utils/numberUtils";

// 分页相关
const pagination = ref({
  page: 1,
  pageSize: 10,
  itemCount: 0,
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
  platformId: null as number | null,
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

// 平台列表相关
const platformOptions = ref<Array<{ label: string; value: number }>>([]);
const loadingPlatforms = ref(false);

// 加载平台列表
async function loadPlatforms() {
  loadingPlatforms.value = true;
  try {
    const platforms = await providerApi.getPlatforms();
    platformOptions.value = platforms.map((platform) => ({
      label: platform.name,
      value: platform.id,
    }));
  } catch (error) {
    message.error(handleApiError(error, "获取平台列表"));
  } finally {
    loadingPlatforms.value = false;
  }
}

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
    if (filters.value.platformId !== null) {
      options.platform_id = filters.value.platformId;
    }

    const response = await listRequestStats(options);
    // 按时间倒序排列，最新的在上方
    logs.value = response.data.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    pagination.value.itemCount = response.count;
  } catch (error) {
    message.error(handleApiError(error, "获取日志列表"));
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
    platformId: null,
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

// 供应商名称缓存
const providerNameCache = reactive(new Map<number, string>());
const providerLoading = reactive(new Map<number, boolean>());

// 获取供应商名称
async function getProviderName(providerId: number): Promise<string> {
  if (providerNameCache.has(providerId)) {
    return providerNameCache.get(providerId)!;
  }

  if (providerLoading.get(providerId)) {
    return "加载中...";
  }

  providerLoading.set(providerId, true);

  try {
    const provider = await providerApi.getPlatformById(providerId);
    const name = provider.name || `供应商 ${providerId}`;
    providerNameCache.set(providerId, name);
    return name;
  } catch (error) {
    console.error("获取供应商信息失败：", error);
    return `获取失败 (ID: ${providerId})`;
  } finally {
    providerLoading.set(providerId, false);
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadPlatforms();
  loadLogs();
});
</script>

<template>
  <n-space vertical>
    <n-card title="筛选条件">
      <n-form label-placement="left" label-width="auto">
        <div class="filter-container">
          <div class="filter-item">
            <label class="filter-label">状态</label>
            <n-select
              v-model:value="filters.success"
              :options="statusOptions"
              clearable
              placeholder="请选择状态"
              style="width: 110px"
            />
          </div>
          <div class="filter-item">
            <label class="filter-label">请求类型</label>
            <n-select
              v-model:value="filters.requestType"
              :options="requestTypeOptions"
              clearable
              placeholder="请选择请求类型"
              style="width: 140px"
            />
          </div>
          <div class="filter-item">
            <label class="filter-label">模型名称</label>
            <n-input
              v-model:value="filters.modelName"
              clearable
              placeholder="请输入模型名称"
              class="filter-input"
            />
          </div>
          <div class="filter-item">
            <label class="filter-label">平台</label>
            <n-select
              v-model:value="filters.platformId"
              :options="platformOptions"
              :loading="loadingPlatforms"
              filterable
              clearable
              :consistent-menu-width="false"
              placeholder="请选择平台"
              style="width: 160px"
            />
          </div>
          <div class="filter-item time-range">
            <label class="filter-label">时间范围</label>
            <n-space>
              <n-date-picker
                v-model:value="filters.startTime"
                type="datetime"
                clearable
                placeholder="开始时间"
                style="width: 190px"
              />
              <span>至</span>
              <n-date-picker
                v-model:value="filters.endTime"
                type="datetime"
                clearable
                placeholder="结束时间"
                style="width: 190px"
              />
            </n-space>
          </div>
          <div class="filter-actions">
            <n-space>
              <n-button type="primary" @click="handleSearch">搜索</n-button>
              <n-button @click="resetFilters">重置</n-button>
            </n-space>
          </div>
        </div>
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
            minWidth: 80,
            width: 160,
            resizable: true,
            ellipsis: {
              tooltip: true
            }
          },
          {
            title: '供应商',
            key: 'platform_id',
            width: 70,
            render(row: RequestStat) {
              const platformId = row.platform_id;

              if (!platformId) {
                return h('span', platformId || '-');
              }

              const providerId = parseInt(platformId.toString());
              if (isNaN(providerId)) {
                return h('span', platformId);
              }

              return h(NTooltip, {
                trigger: 'hover',
                placement: 'top',
                onShow: async () => {
                  // 鼠标悬停时获取供应商名称
                  await getProviderName(providerId);
                }
              }, {
                trigger: () => h('span', platformId),
                default: () => {
                  const name = providerNameCache.get(providerId);
                  const isLoading = providerLoading.get(providerId);

                  return isLoading ? '加载中...' : (name || `供应商ID: ${providerId}`);
                }
              });
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
            width: 100,
            render(row: RequestStat) {
              return convertMicroseconds(row.duration).formatted;
            }
          },
          {
            title: '输入',
            key: 'prompt_tokens',
            width: 80,
            render(row: RequestStat) {
              return formatTokens(row.prompt_tokens);
            }
          },
          {
            title: '输出',
            key: 'completion_tokens',
            width: 80,
            render(row: RequestStat) {
              return formatTokens(row.completion_tokens);
            }
          },
          {
            title: '总计',
            key: 'total_tokens',
            width: 80,
            render(row: RequestStat) {
              return formatTokens(row.total_tokens);
            }
          },
          {
            title: '首字耗时',
            key: 'first_byte_time',
            width: 100,
            render(row: RequestStat) {
              return row.first_byte_time ? convertMicroseconds(row.first_byte_time).formatted : '-';
            }
          },
          {
            title: '错误信息',
            key: 'error_msg',
            ellipsis: {
              tooltip: {
                scrollable: true,
                style: {
                  maxHeight: '240px',
                  maxWidth: 'calc(100vw - 300px)'
                }
              }
            }
          }
        ]"
        :data="logs"
        :loading="loading"
        :pagination="pagination"
        remote
        scroll-x="1200"
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

.filter-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: end;
}

.filter-item {
  display: flex;
  flex-direction: row;
  gap: 5px;
  align-items: center;
}

.filter-label {
  font-size: 14px;
  line-height: 1.5;
  white-space: nowrap;
}

.filter-actions {
  margin-left: auto;
}

@media (max-width: 768px) {
  .filter-container {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .time-range {
    min-width: auto;
  }

  .filter-actions {
    margin-left: 0;
  }
}
</style>
