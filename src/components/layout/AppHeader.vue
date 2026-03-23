<script setup lang="ts">
import { computed } from 'vue'
import { MoonOutline, SunnyOutline, ContrastOutline, MenuOutline } from '@vicons/ionicons5'
import { useThemeStore } from '@/stores/themeStore'
import ServerSwitcher from '@/components/layout/parts/ServerSwitcher.vue'

interface Props {
  showMenuButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showMenuButton: false,
})

const emit = defineEmits<{
  'toggle-menu': []
}>()

const themeStore = useThemeStore()

const themeIcon = computed(() => {
  if (themeStore.mode === 'light') return SunnyOutline
  if (themeStore.mode === 'dark') return MoonOutline
  return ContrastOutline
})

const themeLabel = computed(() => {
  if (themeStore.mode === 'light') return '浅色'
  if (themeStore.mode === 'dark') return '深色'
  return '跟随系统'
})

function handleToggleMenu() {
  emit('toggle-menu')
}

function handleToggleTheme() {
  themeStore.toggle()
}
</script>

<template>
  <n-layout-header bordered class="app-header">
    <div class="app-header__left">
      <n-button v-if="props.showMenuButton" quaternary circle @click="handleToggleMenu">
        <template #icon>
          <n-icon :component="MenuOutline" />
        </template>
      </n-button>
      <span class="app-header__title">PinAI Frontend</span>
    </div>

    <div class="app-header__right">
      <ServerSwitcher :width="180" />
      <n-button quaternary @click="handleToggleTheme">
        <n-space align="center" :size="6">
          <n-icon :component="themeIcon" />
          <span>{{ themeLabel }}</span>
        </n-space>
      </n-button>
    </div>
  </n-layout-header>
</template>

<style scoped>
.app-header {
  height: 64px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.app-header__left,
.app-header__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-header__title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1;
}
</style>
