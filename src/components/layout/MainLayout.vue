<template>
  <n-flex vertical>
    <n-layout has-sider>
      <PageSider />
      <n-layout>
        <div class="main-layout__content">
          <ContentHeader />
          <div class="main-layout__router-view">
            <router-view />
          </div>
        </div>
      </n-layout>
    </n-layout>
  </n-flex>
</template>

<style scoped>
.main-layout__content {
  padding: 16px;
}

.main-layout__router-view {
  margin-top: 12px;
}
</style>
