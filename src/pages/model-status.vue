<script setup lang="ts">
definePage({
  meta: {
    title: '模型状态监控',
  },
})

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { TimeOutline } from '@vicons/ionicons5'
import { useMessage } from 'naive-ui'
import { getModelStatus } from '@/services/statsApi'
import type {
  ModelStatusItem,
  ModelStatusPoint,
  ModelStatusResponse,
  StatsRange,
} from '@/types/stats'
import { useApiServerCheck } from '@/composables/useApiServerCheck'
import { handleApiError } from '@/utils/errorHandler'

type ModelHealthStatus = 'normal' | 'warning' | 'error' | 'no_data'

const RATE_THRESHOLDS = {
  normal: 0.97,
  warning: 0.9,
} as const

const STATUS_META: Record<
  ModelHealthStatus,
  { label: string; blockColor: string; tagType: 'success' | 'warning' | 'error' | 'default' }
> = {
  normal: { label: '正常', blockColor: '#14b87a', tagType: 'success' },
  warning: { label: '警告', blockColor: '#f2a007', tagType: 'warning' },
  error: { label: '异常', blockColor: '#f44767', tagType: 'error' },
  no_data: { label: '无数据', blockColor: '#c7cbd6', tagType: 'default' },
}

interface ModelStatusView extends ModelStatusItem {
  successRate: number
  status: ModelHealthStatus
  pointsView: Array<
    ModelStatusPoint & {
      successRate: number
      status: ModelHealthStatus
    }
  >
}

const message = useMessage()
const { checkApiServer } = useApiServerCheck()

const selectedRange = ref<StatsRange>('24h')
const modelNameKeyword = ref('')
const loading = ref(false)
const responseData = ref<ModelStatusResponse | null>(null)
const models = ref<ModelStatusView[]>([])
const lastUpdatedAt = ref<Date | null>(null)

const refreshIntervalSeconds = 60
const refreshCountdown = ref(refreshIntervalSeconds)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const rangeOptions = [
  { label: '24 小时', value: '24h' },
  { label: '7 天', value: '7d' },
  { label: '30 天', value: '30d' },
]

const legendItems: Array<{ key: ModelHealthStatus; label: string; color: string }> = [
  { key: 'normal', label: '正常', color: STATUS_META.normal.blockColor },
  { key: 'warning', label: '警告', color: STATUS_META.warning.blockColor },
  { key: 'error', label: '异常', color: STATUS_META.error.blockColor },
  { key: 'no_data', label: '无数据', color: STATUS_META.no_data.blockColor },
]

const summaryText = computed(() => {
  const rangeText =
    rangeOptions.find((item) => item.value === selectedRange.value)?.label ?? '24 小时'
  const modelCount = models.value.length
  const updatedText = lastUpdatedAt.value
    ? lastUpdatedAt.value.toLocaleTimeString('zh-CN', { hour12: false })
    : '--:--:--'
  return `${rangeText} 滑动窗口 · ${modelCount} 个模型 · 更新于 ${updatedText}`
})

const midpointLabel = computed(() => {
  if (selectedRange.value === '24h') {
    return '12 小时前'
  }
  if (selectedRange.value === '7d') {
    return '3.5 天前'
  }
  return '15 天前'
})

const emptyDescription = computed(() => {
  const keyword = modelNameKeyword.value.trim()
  if (keyword) {
    return `未找到与“${keyword}”匹配的模型状态数据`
  }
  return '当前窗口暂无模型状态数据'
})

const axisStartTime = computed(() => {
  if (!responseData.value?.window_start) {
    return '--'
  }
  return formatPointTime(responseData.value.window_start)
})

const axisEndTime = computed(() => {
  if (!responseData.value?.window_end) {
    return '--'
  }
  return formatPointTime(responseData.value.window_end)
})

function calculateSuccessRate(successCount: number, requestCount: number): number {
  if (requestCount <= 0) {
    return 0
  }
  return successCount / requestCount
}

function resolveStatus(rate: number, requestCount: number): ModelHealthStatus {
  if (requestCount <= 0) {
    return 'no_data'
  }
  if (rate >= RATE_THRESHOLDS.normal) {
    return 'normal'
  }
  if (rate >= RATE_THRESHOLDS.warning) {
    return 'warning'
  }
  return 'error'
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function formatPointTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function fetchModelStatus() {
  if (loading.value) {
    return
  }

  try {
    loading.value = true
    const modelName = modelNameKeyword.value.trim()
    const data = await getModelStatus({
      range: selectedRange.value,
      model_name: modelName || undefined,
    })

    responseData.value = data
    models.value = data.models.map((item) => {
      const successRate = calculateSuccessRate(item.success_count, item.total_requests)
      const status = resolveStatus(successRate, item.total_requests)

      const pointsView = item.points.map((point) => {
        const pointSuccessRate = calculateSuccessRate(point.success_count, point.request_count)
        return {
          ...point,
          successRate: pointSuccessRate,
          status: resolveStatus(pointSuccessRate, point.request_count),
        }
      })

      return {
        ...item,
        successRate,
        status,
        pointsView,
      }
    })
    lastUpdatedAt.value = new Date()
    refreshCountdown.value = refreshIntervalSeconds
  } catch (error) {
    message.error(handleApiError(error, '获取模型状态监控数据'))
  } finally {
    loading.value = false
  }
}

function handleRangeChange(value: StatsRange) {
  selectedRange.value = value
  fetchModelStatus()
}

function handleSearch() {
  fetchModelStatus()
}

function handleResetFilter() {
  modelNameKeyword.value = ''
  fetchModelStatus()
}

function handleManualRefresh() {
  fetchModelStatus()
}

function startCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }

  countdownTimer = setInterval(() => {
    if (refreshCountdown.value <= 1) {
      refreshCountdown.value = refreshIntervalSeconds
      fetchModelStatus()
      return
    }
    refreshCountdown.value -= 1
  }, 1000)
}

onMounted(() => {
  if (!checkApiServer()) {
    return
  }

  fetchModelStatus()
  startCountdown()
})

onBeforeUnmount(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})
</script>

<template>
  <div class="model-status-page">
    <n-card :bordered="false" class="header-card">
      <div class="header-main">
        <div class="header-summary">
          <h2 class="page-title">模型状态监控</h2>
          <p class="page-desc">{{ summaryText }}</p>
        </div>

        <div class="header-controls">
          <div class="header-actions">
            <n-select
              v-model:value="selectedRange"
              :options="rangeOptions"
              :consistent-menu-width="false"
              class="range-select"
              @update:value="handleRangeChange"
            />
            <n-input
              v-model:value="modelNameKeyword"
              clearable
              placeholder="按模型名筛选"
              class="keyword-input"
              @keyup.enter="handleSearch"
            />
            <n-button @click="handleSearch">筛选</n-button>
            <n-button quaternary @click="handleResetFilter">重置</n-button>

            <n-button class="refresh-button" :loading="loading" @click="handleManualRefresh">
              <template #icon>
                <n-icon :component="TimeOutline" />
              </template>
              <span class="refresh-text-full">{{ refreshCountdown }}s 后刷新</span>
              <span class="refresh-text-compact">{{ refreshCountdown }}s</span>
            </n-button>
          </div>

          <div class="status-legend">
            <div v-for="item in legendItems" :key="item.key" class="legend-item">
              <span class="legend-dot" :style="{ backgroundColor: item.color }" />
              <span>{{ item.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </n-card>

    <n-spin :show="loading">
      <n-empty v-if="models.length === 0" :description="emptyDescription" />

      <div v-else class="model-list">
        <n-card v-for="model in models" :key="model.model_name" class="model-card">
          <div class="card-top">
            <div class="model-info">
              <span class="model-name">{{ model.model_name }}</span>
              <n-tag size="small" round :type="STATUS_META[model.status].tagType">
                {{ STATUS_META[model.status].label }}
              </n-tag>
            </div>

            <div class="model-meta">
              <span class="rate-value">{{ formatPercent(model.successRate) }}</span>
              <span class="meta-text">成功率 · {{ formatNumber(model.total_requests) }} 请求</span>
            </div>
          </div>

          <div
            class="points-row"
            :style="{
              gridTemplateColumns: `repeat(${Math.max(model.pointsView.length, 1)}, minmax(0, 1fr))`,
            }"
          >
            <n-tooltip
              v-for="(point, index) in model.pointsView"
              :key="`${model.model_name}-${index}`"
            >
              <template #trigger>
                <div
                  class="point-block"
                  :style="{ backgroundColor: STATUS_META[point.status].blockColor }"
                />
              </template>
              <div class="tooltip-content">
                <div>{{ formatPointTime(point.timestamp) }}</div>
                <div>状态：{{ STATUS_META[point.status].label }}</div>
                <div>成功率：{{ formatPercent(point.successRate) }}</div>
                <div>请求：{{ formatNumber(point.request_count) }}</div>
                <div>成功：{{ formatNumber(point.success_count) }}</div>
              </div>
            </n-tooltip>
          </div>

          <div class="time-axis">
            <div class="axis-node">
              <span class="axis-value">{{ axisStartTime }}</span>
            </div>
            <span class="axis-mid">{{ midpointLabel }}</span>
            <div class="axis-node axis-node-end">
              <span class="axis-label">现在</span>
              <span class="axis-value">{{ axisEndTime }}</span>
            </div>
          </div>
        </n-card>
      </div>
    </n-spin>
  </div>
</template>

<style scoped>
.model-status-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header-card,
.model-card {
  margin-bottom: 0;
}

.model-card :deep(.n-card__content) {
  padding: 18px 20px 14px;
}

.header-main {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.page-title {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
  color: #102a54;
}

.page-desc {
  margin: 8px 0 0;
  color: #6d7e9a;
  font-size: 16px;
}

.header-summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.range-select {
  width: 120px;
}

.keyword-input {
  width: 240px;
}

.refresh-button {
  border-radius: 14px;
}

.refresh-text-compact {
  display: none;
}

.status-legend {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding-top: 2px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #5f7191;
  font-size: 13px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.model-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.model-name,
.rate-value {
  font-weight: 700;
}

.model-meta {
  color: #5f7191;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.meta-text {
  font-size: 14px;
}

.points-row {
  display: grid;
  gap: 3px;
  margin-bottom: 6px;
  min-width: 0;
}

.point-block {
  height: 16px;
  width: 100%;
  border-radius: 3px;
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  white-space: nowrap;
}

.time-axis {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #7d8ba4;
  font-size: 11px;
  gap: 8px;
}

.axis-node {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.axis-node-end {
  text-align: right;
}

.axis-label {
  color: #94a0b6;
  white-space: nowrap;
}

.axis-value {
  color: #5f7191;
  white-space: nowrap;
}

.axis-mid {
  color: #94a0b6;
  font-size: 12px;
  white-space: nowrap;
}

@media (max-width: 1200px) {
  .page-title {
    font-size: 28px;
  }

  .meta-text {
    font-size: 13px;
  }

  .point-block {
    height: 14px;
  }
}

@media (max-width: 900px) {
  .header-actions {
    gap: 6px;
  }

  .keyword-input {
    width: min(100%, 360px);
  }

  .range-select,
  .keyword-input {
    width: 100%;
  }

  .refresh-button {
    margin-left: auto;
  }

  .refresh-text-full {
    display: none;
  }

  .refresh-text-compact {
    display: inline;
  }

  .card-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .model-meta {
    justify-content: flex-start;
    gap: 6px;
  }

  .time-axis {
    width: 100%;
    flex-wrap: wrap;
    row-gap: 4px;
  }

  .points-row {
    gap: 2px;
  }

  .point-block {
    min-width: 0;
    height: 12px;
    border-radius: 2px;
  }

  .meta-text {
    font-size: 13px;
  }

  .axis-mid {
    order: 3;
    width: 100%;
    text-align: center;
  }
}
</style>
