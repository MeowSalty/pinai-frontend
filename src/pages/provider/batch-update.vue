<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useElementBounding, useWindowSize } from "@vueuse/core";
import { useBatchUpdateStore } from "@/stores/batchUpdateStore";
import { useProviderBatchUpdate } from "@/composables/useProviderBatchUpdate";
import { useProviderState, type FormModel } from "@/composables/useProviderState";

definePage({
  meta: {
    title: "批量更新模型",
  },
  beforeEnter: (to, from, next) => {
    const batchStore = useBatchUpdateStore();
    if (batchStore.selectedProviders.length === 0) {
      next("/provider");
    } else {
      next();
    }
  },
});

const router = useRouter();
const batchStore = useBatchUpdateStore();
const { currentProvider, newFetchedModels, currentBatchDiffProvider } = useProviderState();
const { processSingleProviderUpdate, handleBatchDiffConfirm, handleBatchDiffCancel } =
  useProviderBatchUpdate();

// 当前步骤
const currentStep = computed(() => {
  const stepMap = {
    confirm: 1,
    progress: 2,
    result: 3,
  };
  return stepMap[batchStore.currentStep];
});

// 是否正在更新
const isUpdating = ref(false);

// 容器引用和自适应高度计算
const scrollbarWrapperRef = ref<HTMLElement | null>(null);
const { top } = useElementBounding(scrollbarWrapperRef);
const { height: windowHeight } = useWindowSize();

// 动态计算滚动区域高度
const scrollbarMaxHeight = computed(() => {
  // 预留底部边距
  const bottomMargin = 185;
  // 计算可用高度
  const available = windowHeight.value - top.value - bottomMargin;
  // 设置最小高度 200px
  return Math.max(200, available);
});

// 显示差异对比
const showDiffModal = ref(false);

// 计算用于差异对比的现有模型列表
const existingModelsForDiff = computed(() => {
  return (currentProvider.value?.models || []) as FormModel[];
});

// 返回列表页
const handleBack = () => {
  router.push("/provider");
};

// 取消并返回
const handleCancel = () => {
  batchStore.reset();
  handleBack();
};

// 开始批量更新
const handleStartUpdate = async () => {
  batchStore.currentStep = "progress";
  isUpdating.value = true;

  // 初始化结果列表
  batchStore.results = batchStore.selectedProviders.map((provider) => ({
    provider,
    status: "pending" as const,
  }));

  // 逐个处理供应商
  for (const result of batchStore.results) {
    try {
      await processSingleProviderUpdate(result.provider, batchStore.options, batchStore.results);
      result.status = "success";
    } catch (error) {
      result.status = "error";
      result.error = error instanceof Error ? error.message : String(error);
    }
  }

  isUpdating.value = false;
  batchStore.currentStep = "result";
};

// 重试失败项
const handleRetryFailed = async () => {
  const failedResults = batchStore.results.filter((r) => r.status === "error");

  if (failedResults.length === 0) {
    return;
  }

  batchStore.currentStep = "progress";
  isUpdating.value = true;

  // 将失败项状态重置为 pending
  failedResults.forEach((result) => {
    result.status = "pending";
    result.error = undefined;
  });

  // 逐个重试失败的供应商
  for (const result of failedResults) {
    try {
      await processSingleProviderUpdate(result.provider, batchStore.options, batchStore.results);
      result.status = "success";
    } catch (error) {
      result.status = "error";
      result.error = error instanceof Error ? error.message : String(error);
    }
  }

  isUpdating.value = false;
  batchStore.currentStep = "result";
};

// 完成并返回
const handleComplete = () => {
  batchStore.reset();
  handleBack();
};
</script>

<template>
  <!-- 步骤导航 -->
  <n-steps :current="currentStep" style="margin-bottom: 24px">
    <n-step title="确认更新" description="选择更新选项" />
    <n-step title="更新进度" description="正在更新模型" />
    <n-step title="更新结果" description="查看更新结果" />
  </n-steps>

  <!-- 步骤 1：确认更新 -->
  <div v-if="batchStore.currentStep === 'confirm'">
    <div>
      <p>即将更新以下 {{ batchStore.selectedProviders.length }} 个供应商的模型：</p>
    </div>

    <div ref="scrollbarWrapperRef">
      <n-scrollbar :style="{ maxHeight: `${scrollbarMaxHeight}px`, margin: '16px 0' }">
        <n-list bordered>
          <n-list-item v-for="provider in batchStore.selectedProviders" :key="provider.id">
            <div style="display: flex; flex-direction: column; gap: 4px">
              <div style="font-weight: 500">{{ provider.name }}</div>
              <div style="font-size: 12px; color: #999">
                <n-tag size="small" type="info">{{ provider.format }}</n-tag>
                <span style="margin-left: 8px">{{ provider.base_url }}</span>
              </div>
            </div>
          </n-list-item>
        </n-list>
      </n-scrollbar>
    </div>

    <n-divider />

    <div style="display: flex; flex-direction: column; gap: 12px">
      <n-checkbox v-model:checked="batchStore.options.autoRename">
        <span>自动重命名模型</span>
        <n-text depth="3" style="font-size: 12px; margin-left: 8px">
          (根据预设规则自动重命名获取到的模型)
        </n-text>
      </n-checkbox>

      <n-checkbox v-model:checked="batchStore.options.autoConfirm">
        <span>自动确认模型变更</span>
        <n-text depth="3" style="font-size: 12px; margin-left: 8px">
          (跳过差异对比界面，直接应用变更)
        </n-text>
      </n-checkbox>
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px">
      <n-button @click="handleCancel">取消</n-button>
      <n-button type="primary" @click="handleStartUpdate">开始更新</n-button>
    </div>
  </div>

  <!-- 步骤 2：更新进度 -->
  <div v-if="batchStore.currentStep === 'progress'">
    <n-scrollbar style="max-height: 400px">
      <n-list bordered>
        <n-list-item v-for="result in batchStore.results" :key="result.provider.id">
          <div style="display: flex; align-items: center; justify-content: space-between">
            <div style="flex: 1">
              <div style="font-weight: 500; margin-bottom: 4px">
                {{ result.provider.name }}
              </div>
              <div v-if="result.status === 'success'" style="font-size: 12px; color: #18a058">
                成功 - 新增 {{ result.addedCount ?? 0 }} 个，删除 {{ result.removedCount ?? 0 }} 个
              </div>
              <div v-else-if="result.status === 'error'" style="font-size: 12px; color: #d03050">
                错误：{{ result.error }}
              </div>
              <div v-else style="font-size: 12px; color: #999">处理中...</div>
            </div>
            <div>
              <n-tag v-if="result.status === 'success'" type="success">成功</n-tag>
              <n-tag v-else-if="result.status === 'error'" type="error">失败</n-tag>
              <n-spin v-else size="small" />
            </div>
          </div>
        </n-list-item>
      </n-list>
    </n-scrollbar>
  </div>

  <!-- 步骤 3：更新结果 -->
  <div v-if="batchStore.currentStep === 'result'">
    <n-scrollbar style="max-height: 400px">
      <n-list bordered>
        <n-list-item v-for="result in batchStore.results" :key="result.provider.id">
          <div style="display: flex; align-items: center; justify-content: space-between">
            <div style="flex: 1">
              <div style="font-weight: 500; margin-bottom: 4px">
                {{ result.provider.name }}
              </div>
              <div v-if="result.status === 'success'" style="font-size: 12px; color: #18a058">
                成功 - 新增 {{ result.addedCount ?? 0 }} 个，删除 {{ result.removedCount ?? 0 }} 个
              </div>
              <div v-else-if="result.status === 'error'" style="font-size: 12px; color: #d03050">
                错误：{{ result.error }}
              </div>
            </div>
            <div>
              <n-tag v-if="result.status === 'success'" type="success">成功</n-tag>
              <n-tag v-else-if="result.status === 'error'" type="error">失败</n-tag>
            </div>
          </div>
        </n-list-item>
      </n-list>
    </n-scrollbar>

    <div style="display: flex; justify-content: space-between; margin-top: 24px">
      <n-button
        v-if="batchStore.results.some((r) => r.status === 'error')"
        type="warning"
        @click="handleRetryFailed"
      >
        重试失败项 ({{ batchStore.results.filter((r) => r.status === "error").length }})
      </n-button>
      <div v-else></div>
      <n-button type="primary" @click="handleComplete">完成</n-button>
    </div>
  </div>

  <!-- 批量更新中的模型差异查看模态框 -->
  <n-modal
    v-model:show="showDiffModal"
    preset="card"
    style="width: 800px; max-height: 80vh"
    :title="`模型变更确认 - ${currentBatchDiffProvider?.name}`"
    content-style="overflow: auto;"
    :mask-closable="false"
    :closable="true"
    @update:show="(show: boolean) => !show && handleBatchDiffCancel()"
  >
    <ModelDiffViewer
      v-if="currentProvider && currentBatchDiffProvider"
      :existing-models="existingModelsForDiff"
      :new-models="newFetchedModels"
      @confirm="handleBatchDiffConfirm"
      @cancel="handleBatchDiffCancel"
    />
  </n-modal>
</template>
