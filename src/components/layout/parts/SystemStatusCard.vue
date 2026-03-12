<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RefreshOutline } from '@vicons/ionicons5'
import { getRealtimeStats } from '@/services/statsApi'
import { useApiServerCheck } from '@/composables/useApiServerCheck'
import { useThemeStore } from '@/stores/themeStore'
import type { RealtimeStats } from '@/types/stats'

interface Props {
  collapsed: boolean
}

const props = defineProps<Props>()
const { checkApiServer } = useApiServerCheck()
const themeStore = useThemeStore()

const realtimeLoading = ref(false)
const realtimeStats = ref<RealtimeStats | null>(null)
const autoRefresh = ref(true)

let refreshTimer: number | null = null

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

const startAutoRefresh = () => {
  stopAutoRefresh()
  if (!autoRefresh.value) {
    return
  }
  refreshTimer = window.setInterval(fetchRealtimeStats, 5000)
}

const fetchRealtimeStats = async () => {
  try {
    realtimeLoading.value = true
    realtimeStats.value = await getRealtimeStats()
  } catch (error) {
    console.error('获取实时状态失败：', error)
  } finally {
    realtimeLoading.value = false
  }
}

onMounted(() => {
  if (!checkApiServer()) {
    return
  }

  fetchRealtimeStats()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})

const handleAutoRefreshChange = (value: boolean) => {
  autoRefresh.value = value
  startAutoRefresh()
}

const handleManualRefresh = () => {
  fetchRealtimeStats()
}
</script>

<template>
  <n-card
    v-show="!props.collapsed"
    :bordered="false"
    size="small"
    class="system-status-card"
    :class="themeStore.isDark ? 'is-dark' : 'is-light'"
  >
    <template #header>
      <div class="status-header">
        <div class="status-title-wrap">
          <span class="status-indicator" />
          <span class="status-title">系统状态</span>
        </div>
        <div class="status-actions">
          <n-button
            strong
            secondary
            size="tiny"
            :type="autoRefresh ? 'info' : undefined"
            :tertiary="!autoRefresh"
            @click="handleAutoRefreshChange(!autoRefresh)"
          >
            Auto
          </n-button>
          <n-button
            v-show="!autoRefresh"
            size="tiny"
            circle
            tertiary
            :loading="realtimeLoading"
            @click="handleManualRefresh"
          >
            <template #icon>
              <n-icon :component="RefreshOutline" />
            </template>
          </n-button>
        </div>
      </div>
    </template>

    <n-spin :show="realtimeLoading" size="small">
      <div class="status-grid">
        <div class="status-item">
          <div class="status-label">RPM</div>
          <div class="status-value">{{ realtimeStats?.rpm ?? 0 }}</div>
        </div>
        <div class="status-item">
          <div class="status-label">活动连接</div>
          <div class="status-value">{{ realtimeStats?.active_connections ?? 0 }}</div>
        </div>
      </div>
    </n-spin>
  </n-card>
</template>

<style scoped>
.system-status-card {
  border-radius: 10px;
}

.system-status-card.is-dark {
  background: linear-gradient(180deg, #1f2937 0%, #111827 100%);
}

.system-status-card.is-light {
  background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.status-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #22c55e;
  box-shadow: 0 0 0 3px rgb(34 197 94 / 20%);
  animation: statusPulse 1.8s ease-in-out infinite;
}

@keyframes statusPulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgb(34 197 94 / 40%);
  }
  50% {
    transform: scale(1.15);
    box-shadow: 0 0 0 6px rgb(34 197 94 / 0%);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgb(34 197 94 / 0%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-indicator {
    animation: none;
  }
}

.status-title {
  font-size: 13px;
  font-weight: 600;
}

.system-status-card.is-dark .status-title {
  color: #f3f4f6;
}

.system-status-card.is-light .status-title {
  color: #0f172a;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.status-item {
  padding: 8px;
  border-radius: 8px;
}

.system-status-card.is-dark .status-item {
  background: rgb(255 255 255 / 6%);
}

.system-status-card.is-light .status-item {
  background: rgb(255 255 255 / 58%);
}

.status-label {
  font-size: 12px;
  line-height: 1.2;
}

.system-status-card.is-dark .status-label {
  color: #9ca3af;
}

.system-status-card.is-light .status-label {
  color: #475569;
}

.status-value {
  margin-top: 4px;
  font-size: 18px;
  line-height: 1.2;
  font-weight: 700;
}

.system-status-card.is-dark .status-value {
  color: #f9fafb;
}

.system-status-card.is-light .status-value {
  color: #0f172a;
}
</style>
