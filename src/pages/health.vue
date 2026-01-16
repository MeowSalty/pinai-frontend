<script setup lang="ts">
definePage({
  meta: {
    title: "健康",
  },
});

import HealthOverviewTab from "@/components/health/HealthOverviewTab.vue";
import HealthPlatformTab from "@/components/health/HealthPlatformTab.vue";
import HealthApiKeyTab from "@/components/health/HealthApiKeyTab.vue";
import HealthModelTab from "@/components/health/HealthModelTab.vue";
import { useHealthActions } from "@/composables/useHealthActions";
import { useHealthState } from "@/composables/useHealthState";

const {
  healthData,
  loading,
  platformHealthList,
  platformListLoading,
  platformPagination,
  apiKeyHealthList,
  apiKeyListLoading,
  apiKeyPagination,
  modelHealthList,
  modelListLoading,
  modelPagination,
  issuesList,
  issuesLoading,
  platformSegments,
  apiKeySegments,
  modelSegments,
} = useHealthState();

const {
  handleRecoverIssue,
  handleEnablePlatform,
  handleEnableApiKey,
  handleEnableModel,
  handlePlatformPageChange,
  handlePlatformPageSizeChange,
  handleApiKeyPageChange,
  handleApiKeyPageSizeChange,
  handlePageChange,
  handlePageSizeChange,
  handleTabChange,
} = useHealthActions();
</script>

<template>
  <n-spin :show="loading">
    <n-tabs type="line" animated default-value="overview" @update:value="handleTabChange">
      <n-tab-pane name="overview" tab="概述">
        <HealthOverviewTab
          :health-data="healthData"
          :platform-segments="platformSegments"
          :api-key-segments="apiKeySegments"
          :model-segments="modelSegments"
          :issues-list="issuesList"
          :issues-loading="issuesLoading"
          @recover-issue="handleRecoverIssue"
        />
      </n-tab-pane>

      <n-tab-pane name="platform" tab="平台">
        <HealthPlatformTab
          :platform-health-list="platformHealthList"
          :loading="platformListLoading"
          :pagination="platformPagination"
          @enable-platform="handleEnablePlatform"
          @page-change="handlePlatformPageChange"
          @page-size-change="handlePlatformPageSizeChange"
        />
      </n-tab-pane>

      <n-tab-pane name="apikey" tab="密钥">
        <HealthApiKeyTab
          :api-key-health-list="apiKeyHealthList"
          :loading="apiKeyListLoading"
          :pagination="apiKeyPagination"
          @enable-api-key="handleEnableApiKey"
          @page-change="handleApiKeyPageChange"
          @page-size-change="handleApiKeyPageSizeChange"
        />
      </n-tab-pane>

      <n-tab-pane name="model" tab="模型">
        <HealthModelTab
          :model-health-list="modelHealthList"
          :loading="modelListLoading"
          :pagination="modelPagination"
          @enable-model="handleEnableModel"
          @page-change="handlePageChange"
          @page-size-change="handlePageSizeChange"
        />
      </n-tab-pane>
    </n-tabs>
  </n-spin>
</template>

<style scoped>
.n-card {
  margin-bottom: 20px;
}
</style>
