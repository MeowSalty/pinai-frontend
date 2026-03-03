<template>
  <n-flex vertical>
    <n-layout has-sider>
      <PageSider />
      <n-layout>
        <n-card :bordered="false">
          <ContentHeader />
          <router-view />
        </n-card>
      </n-layout>
    </n-layout>
  </n-flex>
</template>
