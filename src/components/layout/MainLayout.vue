<script setup lang="ts">
const MOBILE_BREAKPOINT = '(max-width: 768px)'

const isMobile = ref(false)
const isDrawerOpen = ref(false)
const sidebarCollapsed = ref(false)
const mediaQueryList = ref<MediaQueryList | null>(null)
const route = useRoute()

function handleViewportChange(event: MediaQueryListEvent) {
  isMobile.value = event.matches
}

function handleToggleMenu() {
  if (isMobile.value) {
    isDrawerOpen.value = !isDrawerOpen.value
    return
  }

  sidebarCollapsed.value = !sidebarCollapsed.value
}

onMounted(() => {
  mediaQueryList.value = window.matchMedia(MOBILE_BREAKPOINT)
  isMobile.value = mediaQueryList.value.matches
  mediaQueryList.value.addEventListener('change', handleViewportChange)
})

onBeforeUnmount(() => {
  mediaQueryList.value?.removeEventListener('change', handleViewportChange)
})

watch(isMobile, (value) => {
  if (!value) {
    isDrawerOpen.value = false
  }
})

watch(
  () => route.fullPath,
  () => {
    isDrawerOpen.value = false
  },
)
</script>

<template>
  <n-layout has-sider class="main-layout">
    <AppSidebar v-if="!isMobile" v-model:collapsed="sidebarCollapsed" />

    <n-layout class="main-layout__main">
      <AppHeader
        :is-mobile="isMobile"
        :collapsed="sidebarCollapsed"
        @toggle-menu="handleToggleMenu"
      />

      <n-layout-content class="main-layout__content-scroll" :native-scrollbar="false">
        <div class="main-layout__content-container">
          <RouterView />
        </div>
      </n-layout-content>
    </n-layout>
  </n-layout>

  <n-drawer v-model:show="isDrawerOpen" placement="left" :width="220">
    <n-drawer-content body-content-style="padding: 0">
      <div class="main-layout__drawer-sidebar">
        <AppSidebar :collapsed="false" :show-status-card="false" />
      </div>
    </n-drawer-content>
  </n-drawer>
</template>

<style scoped>
.main-layout {
  height: 100vh;
}

.main-layout__main {
  min-width: 0;
  height: 100vh;
}

.main-layout__content-scroll {
  height: calc(100vh - 64px);
}

.main-layout__content-container {
  min-height: 100%;
  padding: 16px;
}

.main-layout__drawer-sidebar {
  height: 100%;
}

@media (max-width: 768px) {
  .main-layout__content-container {
    padding: 12px;
  }
}
</style>
