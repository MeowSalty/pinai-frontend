<script setup lang="ts">
import { h, ref, watch, type Component } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { NIcon, type MenuOption } from 'naive-ui'
import { Cloud, GitNetworkOutline, List, PulseOutline } from '@vicons/ionicons5'
import { DashboardFilled } from '@vicons/material'
import { useThemeStore } from '@/stores/themeStore'
import SystemStatusCard from '@/components/layout/parts/SystemStatusCard.vue'

interface Props {
  collapsed?: boolean
  showStatusCard?: boolean
  inDrawer?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
  showStatusCard: true,
  inDrawer: false,
})

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
}>()

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const themeStore = useThemeStore()
const route = useRoute()
const collapsed = ref(props.collapsed)

watch(
  () => props.collapsed,
  (value) => {
    collapsed.value = value
  },
)

watch(collapsed, (value) => {
  emit('update:collapsed', value)
})

const routeKey = ref(route.path.replace('/', '') || 'dashboard')

watch(
  () => route.path,
  (newPath) => {
    routeKey.value = newPath.replace('/', '') || 'dashboard'
  },
)

const menuOptions: MenuOption[] = [
  {
    label: () => h(RouterLink, { to: { path: '/dashboard' } }, { default: () => '仪表盘' }),
    key: 'dashboard',
    icon: renderIcon(DashboardFilled),
  },
  {
    label: () => h(RouterLink, { to: { path: '/health' } }, { default: () => '健康' }),
    key: 'health',
    icon: renderIcon(PulseOutline),
  },
  {
    label: () => h(RouterLink, { to: { path: '/provider' } }, { default: () => '供应商' }),
    key: 'provider',
    icon: renderIcon(Cloud),
  },
  {
    label: () => h(RouterLink, { to: { path: '/logs' } }, { default: () => '使用日志' }),
    key: 'logs',
    icon: renderIcon(List),
  },
]
</script>

<template>
  <n-layout-sider
    v-if="!props.inDrawer"
    v-model:collapsed="collapsed"
    :bordered="!themeStore.isDark"
    collapse-mode="width"
    :collapsed-width="64"
    :width="200"
    :native-scrollbar="false"
  >
    <div class="sidebar-inner">
      <div class="sidebar-brand">
        <div class="sidebar-brand__logo" aria-label="网关">
          <n-icon size="18">
            <GitNetworkOutline />
          </n-icon>
        </div>
        <span v-show="!collapsed" class="sidebar-brand__name">拼好 AI</span>
      </div>

      <n-menu
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :value="routeKey"
      />
      <div v-if="props.showStatusCard">
        <SystemStatusCard :collapsed="collapsed" />
      </div>
    </div>
  </n-layout-sider>

  <div v-else class="sidebar-panel">
    <div class="sidebar-inner">
      <div class="sidebar-brand">
        <div class="sidebar-brand__logo" aria-label="网关">
          <n-icon size="18">
            <GitNetworkOutline />
          </n-icon>
        </div>
        <span class="sidebar-brand__name">拼好 AI</span>
      </div>

      <n-menu
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :value="routeKey"
      />
      <div v-if="props.showStatusCard">
        <SystemStatusCard :collapsed="false" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar-panel {
  width: 100%;
}

.sidebar-inner {
  min-height: 100%;
}

.sidebar-brand {
  height: 64px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.sidebar-brand__logo {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2563eb, #0ea5e9 45%, #10b981);
  color: #fff;
  box-shadow: 0 2px 8px rgb(37 99 235 / 25%);
  flex-shrink: 0;
}

.sidebar-brand__name {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
