<script setup lang="ts">
definePage({
  meta: {
    title: "使用日志",
  },
});
import { ref, onMounted, h, reactive, computed } from "vue";
import { listRequestStats } from "@/services/statsApi";
import { providerApi } from "@/services/providerApi";
import type { RequestStat, ListRequestStatsOptions } from "@/types/stats";
import { useMessage, NFlex, NText, NTag, NIcon, NEllipsis } from "naive-ui";
import { CheckmarkCircle, CloseCircle, TimeOutline, FunnelOutline } from "@vicons/ionicons5";
import { handleApiError } from "@/utils/errorHandler";
import { convertMicroseconds } from "@/utils/timeUtils";
import { formatTokens } from "@/utils/numberUtils";
import { useApiServerCheck } from "@/composables/useApiServerCheck";

// 分页相关
const pagination = ref({
  page: 1,
  pageSize: 5,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [5, 10, 20, 50],
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

type FilterKey = keyof typeof filters.value;

// 高级筛选面板展开状态
const filterPanelExpanded = ref(false);

// 数据列表
const logs = ref<RequestStat[]>([]);
const loading = ref(false);
const message = useMessage();
const { checkApiServer } = useApiServerCheck();

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

const activeFilters = computed<Array<{ key: FilterKey; label: string; value: unknown }>>(() => {
  const active: Array<{ key: FilterKey; label: string; value: unknown }> = [];

  if (filters.value.success !== null) {
    active.push({
      key: "success",
      label: `状态：${filters.value.success ? "成功" : "失败"}`,
      value: filters.value.success,
    });
  }

  if (filters.value.requestType) {
    const requestTypeLabel =
      requestTypeOptions.find((option) => option.value === filters.value.requestType)?.label ||
      filters.value.requestType;

    active.push({
      key: "requestType",
      label: `请求类型：${requestTypeLabel}`,
      value: filters.value.requestType,
    });
  }

  if (filters.value.modelName) {
    active.push({
      key: "modelName",
      label: `模型：${filters.value.modelName}`,
      value: filters.value.modelName,
    });
  }

  if (filters.value.platformId !== null) {
    const platformName = platformOptions.value.find(
      (item) => item.value === filters.value.platformId,
    )?.label;

    active.push({
      key: "platformId",
      label: `平台：${platformName || filters.value.platformId}`,
      value: filters.value.platformId,
    });
  }

  if (filters.value.startTime) {
    active.push({
      key: "startTime",
      label: `开始：${new Date(filters.value.startTime).toLocaleString("zh-CN")}`,
      value: filters.value.startTime,
    });
  }

  if (filters.value.endTime) {
    active.push({
      key: "endTime",
      label: `结束：${new Date(filters.value.endTime).toLocaleString("zh-CN")}`,
      value: filters.value.endTime,
    });
  }

  return active;
});

const activeFilterCount = computed(() => activeFilters.value.length);

function parseRequestType(requestType: string | null | undefined) {
  const normalizedType = (requestType || "").toLowerCase();
  const isNative = normalizedType.endsWith("-native");
  const baseType = normalizedType.replace(/-native$/, "");
  const isStream = baseType === "stream";

  return {
    isNative,
    isStream,
    streamLabel: isStream ? "流式" : "非流式",
  };
}

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
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const uniquePlatformIds = [
      ...new Set(
        logs.value
          .map((log) => log.platform_id)
          .filter((id) => id !== null && id !== undefined)
          .map((id) => parseInt(id.toString(), 10))
          .filter((id) => !isNaN(id)),
      ),
    ];

    await Promise.all(
      uniquePlatformIds.filter((id) => !providerNameCache.has(id)).map((id) => getProviderName(id)),
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

function handleRemoveFilter(key: FilterKey) {
  filters.value[key] = null;
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
  // 检查 API 服务器
  if (!checkApiServer()) {
    return;
  }

  loadPlatforms();
  loadLogs();
});
</script>

<template>
  <n-space vertical>
    <n-card title="请求日志">
      <template #header-extra>
        <n-badge :value="activeFilterCount" :show="activeFilterCount > 0" type="info">
          <n-button
            :type="filterPanelExpanded ? 'primary' : 'default'"
            aria-label="切换高级筛选面板"
            @click="filterPanelExpanded = !filterPanelExpanded"
          >
            <template #icon>
              <n-icon>
                <FunnelOutline />
              </n-icon>
            </template>
            筛选
          </n-button>
        </n-badge>
      </template>

      <n-collapse-transition :show="filterPanelExpanded">
        <div style="padding-bottom: 16px">
          <n-form label-placement="left" label-width="auto">
            <n-grid :cols="24" :x-gap="24">
              <n-form-item-gi :span="3" path="statusValue">
                <n-select
                  v-model:value="filters.success"
                  :options="statusOptions"
                  clearable
                  placeholder="状态"
                />
              </n-form-item-gi>
              <n-form-item-gi :span="3" path="requestType">
                <n-select
                  v-model:value="filters.requestType"
                  :options="requestTypeOptions"
                  clearable
                  placeholder="请求类型"
                />
              </n-form-item-gi>
              <n-form-item-gi :span="3" path="modelName">
                <n-input v-model:value="filters.modelName" clearable placeholder="模型名称" />
              </n-form-item-gi>
              <n-form-item-gi :span="3" path="platformId">
                <n-select
                  v-model:value="filters.platformId"
                  :options="platformOptions"
                  :loading="loadingPlatforms"
                  filterable
                  clearable
                  :consistent-menu-width="false"
                  placeholder="平台"
                />
              </n-form-item-gi>
              <n-form-item-gi :span="4" path="timeRange">
                <n-date-picker
                  v-model:value="filters.startTime"
                  type="datetime"
                  clearable
                  placeholder="开始时间"
                />
              </n-form-item-gi>
              <n-form-item-gi :span="4" path="timeRange">
                <n-date-picker
                  v-model:value="filters.endTime"
                  type="datetime"
                  clearable
                  placeholder="结束时间"
                />
              </n-form-item-gi>
              <n-gi :span="24">
                <div style="display: flex; justify-content: flex-end; gap: 8px">
                  <n-button type="primary" @click="handleSearch">搜索</n-button>
                  <n-button @click="resetFilters">重置</n-button>
                </div>
              </n-gi>
            </n-grid>
          </n-form>
        </div>
      </n-collapse-transition>

      <n-space v-if="activeFilterCount > 0" vertical :size="12" style="margin-bottom: 16px">
        <n-flex align="center" :size="8" wrap>
          <n-text strong>活跃筛选：</n-text>
          <n-flex :size="8" wrap aria-label="活跃筛选条件">
            <n-tag
              v-for="filter in activeFilters"
              :key="filter.key"
              closable
              @close="handleRemoveFilter(filter.key)"
            >
              {{ filter.label }}
            </n-tag>
          </n-flex>
          <n-button text type="error" aria-label="清空全部筛选条件" @click="resetFilters">
            Clear all
          </n-button>
        </n-flex>
      </n-space>

      <n-data-table
        :columns="[
          {
            title: '时间',
            key: 'timestamp',
            width: 110,
            render(row: RequestStat) {
              const date = new Date(row.timestamp);
              const timeStr = date.toLocaleTimeString('zh-CN', { hour12: false });
              const dateStr = date.toLocaleDateString('zh-CN');

              return h(NFlex, { vertical: true, size: 0 }, [
                h(NText, { strong: true }, { default: () => timeStr }),
                h(NText, { depth: 3 }, { default: () => dateStr }),
              ]);
            },
          },
          {
            title: '状态',
            key: 'status',
            width: 80,
            render(row: RequestStat) {
              const requestTypeInfo = parseRequestType(row.request_type);
              const typeTags = [];

              if (requestTypeInfo.isNative) {
                typeTags.push(
                  h(
                    NTag,
                    {
                      size: 'tiny',
                      bordered: false,
                      type: 'warning',
                    },
                    { default: () => '原生' },
                  ),
                );
              }

              typeTags.push(
                h(
                  NTag,
                  {
                    size: 'tiny',
                    bordered: false,
                    type: requestTypeInfo.isStream ? 'info' : 'default',
                  },
                  { default: () => requestTypeInfo.streamLabel },
                ),
              );

              return h(NFlex, { vertical: true, size: 4, align: 'flex-start' }, [
                h(
                  NTag,
                  {
                    type: row.success ? 'success' : 'error',
                    size: 'small',
                    round: true,
                  },
                  {
                    icon: () =>
                      h(NIcon, null, {
                        default: () => h(row.success ? CheckmarkCircle : CloseCircle),
                      }),
                    default: () => (row.success ? '成功' : '失败'),
                  },
                ),
                h(NFlex, { size: 4, align: 'center', justify: 'center', wrap: false }, typeTags),
              ]);
            },
          },
          {
            title: '模型名称',
            key: 'model_name',
            minWidth: 150,
            resizable: true,
            render(row: RequestStat) {
              const originalModelName = (row.original_model_name || '').trim();
              const actualModelName = (row.model_name || '').trim();
              const hasOriginalModel = !!originalModelName;
              const isModelMapped = hasOriginalModel && originalModelName !== actualModelName;

              const children = [
                isModelMapped
                  ? h(
                      NEllipsis,
                      { tooltip: true },
                      {
                        default: () =>
                          h(NFlex, { size: 6, align: 'center', wrap: false }, [
                            h(
                              NText,
                              {
                                depth: 3,
                                delete: true,
                              },
                              { default: () => originalModelName },
                            ),
                            h(
                              NText,
                              {
                                depth: 3,
                                style: { fontSize: '12px' },
                              },
                              { default: () => '➔' },
                            ),
                            h(
                              NText,
                              {
                                strong: true,
                                style: { fontWeight: 'bold' },
                              },
                              { default: () => actualModelName },
                            ),
                          ]),
                      },
                    )
                  : h(
                      NEllipsis,
                      { tooltip: true, style: { fontWeight: 'bold' } },
                      { default: () => actualModelName || originalModelName || '-' },
                    ),
              ];

              if (row.platform_id !== null && row.platform_id !== undefined) {
                const providerId = parseInt(row.platform_id.toString(), 10);
                if (!isNaN(providerId)) {
                  const platformName = providerNameCache.get(providerId);
                  children.push(
                    h(
                      NText,
                      {
                        depth: 3,
                        style: { fontSize: '12px' },
                      },
                      { default: () => platformName || `平台 ${row.platform_id}` },
                    ),
                  );
                }
              }

              if (!row.success && row.error_msg) {
                children.push(
                  h(
                    NEllipsis,
                    {
                      lineClamp: 1,
                      tooltip: {
                        scrollable: true,
                        contentStyle: { maxHeight: '240px', maxWidth: 'calc(100vw - 300px)' },
                      },
                      style: { fontSize: '12px', color: '#d03050' },
                    },
                    { default: () => row.error_msg! },
                  ),
                );
              }

              return h(NFlex, { vertical: true, size: 0 }, children);
            },
          },
          {
            title: 'Token 用量',
            key: 'tokens',
            width: 120,
            render(row: RequestStat) {
              return h(NFlex, { vertical: true, size: 0, align: 'center' }, [
                h(
                  NText,
                  {
                    strong: true,
                    style: { fontSize: '14px' },
                  },
                  { default: () => formatTokens(row.total_tokens) },
                ),
                h(
                  NText,
                  {
                    depth: 3,
                    style: { fontSize: '12px' },
                  },
                  {
                    default: () =>
                      `↑${formatTokens(row.prompt_tokens)} / ↓${formatTokens(row.completion_tokens)}`,
                  },
                ),
              ]);
            },
          },
          {
            title: '延迟性能',
            key: 'latency',
            width: 130,
            render(row: RequestStat) {
              const requestTypeInfo = parseRequestType(row.request_type);
              const children = [
                h(NFlex, { size: 4, align: 'center', justify: 'center' }, [
                  h(NIcon, { size: 14 }, { default: () => h(TimeOutline) }),
                  h(NText, null, { default: () => convertMicroseconds(row.duration).formatted }),
                ]),
              ];

              if (requestTypeInfo.isStream && row.first_byte_time) {
                children.push(
                  h(NFlex, { size: 4, align: 'center', justify: 'center' }, [
                    h(
                      NText,
                      {
                        style: { color: '#f0a020', fontSize: '12px' },
                      },
                      { default: () => '⚡' },
                    ),
                    h(
                      NText,
                      {
                        depth: 3,
                        style: { fontSize: '12px' },
                      },
                      { default: () => convertMicroseconds(row.first_byte_time!).formatted },
                    ),
                  ]),
                );
              }

              return h(NFlex, { vertical: true, size: 2 }, children);
            },
          },
        ]"
        :data="logs"
        :loading="loading"
        :pagination="pagination"
        remote
        scroll-x="600"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </n-card>
  </n-space>
</template>
