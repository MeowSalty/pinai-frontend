<template>
  <n-flex vertical>
    <n-layout has-sider>
      <PageSider />
      <n-layout>
        <n-layout-content content-style="padding: 24px"><router-view /></n-layout-content>
      </n-layout>
    </n-layout>
  </n-flex>
</template>
