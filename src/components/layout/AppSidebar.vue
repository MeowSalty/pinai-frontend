<script setup lang="ts">
import { h, ref, watch, type Component } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { NIcon, type MenuOption } from 'naive-ui'
import { Cloud, List, PulseOutline } from '@vicons/ionicons5'
import { DashboardFilled } from '@vicons/material'
import { useThemeStore } from '@/stores/themeStore'
import SystemStatusCard from '@/components/layout/parts/SystemStatusCard.vue'

interface Props {
  collapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
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
    v-model:collapsed="collapsed"
    class="app-sidebar"
    :bordered="!themeStore.isDark"
    collapse-mode="width"
    :collapsed-width="64"
    :width="200"
    :native-scrollbar="false"
  >
    <div class="app-sidebar__inner">
      <n-menu
        class="app-sidebar__menu"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :value="routeKey"
      />
      <div class="app-sidebar__status-card-wrap">
        <SystemStatusCard :collapsed="collapsed" />
      </div>
    </div>
  </n-layout-sider>
</template>

<style scoped>
.app-sidebar {
  position: relative;
  height: 100%;
}

.app-sidebar__inner {
  position: relative;
  height: 100%;
  min-height: 0;
  padding: 8px 8px 12px;
}

.app-sidebar__menu {
  padding-bottom: 160px;
}

.app-sidebar__status-card-wrap {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 12px;
}
</style>
