<script setup lang="ts">
import { computed, ref, h } from "vue";
import { useRouter } from "vue-router";
import { useElementBounding, useWindowSize } from "@vueuse/core";
import { useBatchUpdateStore } from "@/stores/batchUpdateStore";
import { useProviderBatchUpdate } from "@/composables/useProviderBatchUpdate";
import { useProviderState, type FormModel } from "@/composables/useProviderState";
import type { DataTableColumns } from "naive-ui";
import { NTag } from "naive-ui";

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

// 计算平台（供应商）总体进度
const providerProgress = computed(() => {
  if (batchStore.results.length === 0) return 0;
  const completed = batchStore.results.filter(
    (r) => r.status === "success" || r.status === "error"
  ).length;
  return Math.round((completed / batchStore.results.length) * 100);
});

// 获取当前正在处理的供应商
const currentProcessingProvider = computed(() => {
  return batchStore.results.find((r) => r.status === "pending");
});

// 计算当前供应商的密钥进度
const currentKeyProgress = computed(() => {
  const current = currentProcessingProvider.value;
  if (!current || current.keyResults.length === 0) return 0;
  const completed = current.keyResults.filter(
    (r) => r.status === "success" || r.status === "error"
  ).length;
  return Math.round((completed / current.keyResults.length) * 100);
});

// 计算当前供应商的密钥完成数量
const currentKeyCompleted = computed(() => {
  const current = currentProcessingProvider.value;
  if (!current) return { completed: 0, total: 0 };
  const completed = current.keyResults.filter(
    (r) => r.status === "success" || r.status === "error"
  ).length;
  return { completed, total: current.keyResults.length };
});

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

// 扁平化的密钥结果数据（用于表格展示）
interface FlatKeyResult {
  key: string; // 唯一标识
  providerName: string;
  providerUrl: string;
  keyValue: string;
  status: "pending" | "success" | "error";
  error?: string;
  modelCount?: number;
  addedCount?: number;
  removedCount?: number;
}

const flatKeyResults = computed<FlatKeyResult[]>(() => {
  const results: FlatKeyResult[] = [];
  for (const result of batchStore.results) {
    for (const keyResult of result.keyResults) {
      results.push({
        key: `${result.provider.id}-${keyResult.keyId}`,
        providerName: result.provider.name,
        providerUrl: result.provider.base_url,
        keyValue: keyResult.keyValue,
        status: keyResult.status,
        error: keyResult.error,
        modelCount: keyResult.modelCount,
        addedCount: result.addedCount,
        removedCount: result.removedCount,
      });
    }
  }
  return results;
});

// 表格列定义
const resultColumns: DataTableColumns<FlatKeyResult> = [
  {
    title: "名称",
    key: "providerName",
    width: 150,
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: "URL",
    key: "providerUrl",
    width: 250,
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: "密钥",
    key: "keyValue",
    width: 150,
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: "状态",
    key: "status",
    width: 100,
    align: "center",
    filter(value, row) {
      return row.status === value;
    },
    filterOptions: [
      { label: "成功", value: "success" },
      { label: "失败", value: "error" },
    ],
    render: (row) => {
      if (row.status === "success") {
        return h(NTag, { type: "success" }, { default: () => "成功" });
      } else if (row.status === "error") {
        return h(NTag, { type: "error" }, { default: () => "失败" });
      } else {
        return h(NTag, { type: "default" }, { default: () => "处理中" });
      }
    },
  },
  {
    title: "信息",
    key: "info",
    ellipsis: {
      tooltip: true,
    },
    render: (row) => {
      if (row.status === "success") {
        const added = row.addedCount ?? 0;
        const removed = row.removedCount ?? 0;
        if (added === 0 && removed === 0) {
          return "无变更";
        } else if (added > 0 && removed === 0) {
          return `新增 ${added} 个模型`;
        } else if (added === 0 && removed > 0) {
          return `删除 ${removed} 个模型`;
        } else {
          return `新增 ${added} 个，删除 ${removed} 个模型`;
        }
      } else if (row.status === "error") {
        return row.error || "未知错误";
      } else {
        return "处理中...";
      }
    },
  },
];

// 行样式
const getRowClassName = (row: FlatKeyResult) => {
  if (row.status === "error") {
    return "error-row";
  }
  return "";
};

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
    keyResults: [], // 初始化密钥结果列表
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
    result.keyResults.forEach((kr) => {
      kr.status = "pending";
      kr.error = undefined;
    });
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

<style scoped>
.error-row {
  background-color: rgba(208, 48, 80, 0.1);
}
</style>

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
                <n-tag size="small" type="info">{{ provider.provider }}</n-tag>
                <n-tag v-if="provider.variant" size="small" type="default" style="margin-left: 6px">
                  {{ provider.variant }}
                </n-tag>
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
    <n-space vertical :size="16">
      <!-- 双进度条 -->
      <n-card size="small" :bordered="false">
        <!-- 供应商级别进度 -->
        <n-space vertical :size="8">
          <div style="display: flex; justify-content: space-between; align-items: center">
            <n-text>供应商进度</n-text>
            <n-text strong>
              {{
                batchStore.results.filter((r) => r.status === "success" || r.status === "error")
                  .length
              }}
              / {{ batchStore.results.length }}
            </n-text>
          </div>
          <n-progress
            type="line"
            :percentage="providerProgress"
            :status="providerProgress === 100 ? 'success' : 'default'"
            :show-indicator="false"
          />
        </n-space>

        <!-- 当前供应商的密钥进度 -->
        <n-space v-if="currentProcessingProvider" vertical :size="8" style="margin-top: 16px">
          <div style="display: flex; justify-content: space-between; align-items: center">
            <n-text depth="2">
              当前：{{ currentProcessingProvider.provider.name }}
              <n-tag
                v-if="currentProcessingProvider.provider.variant"
                size="small"
                type="default"
                style="margin-left: 6px"
              >
                {{ currentProcessingProvider.provider.variant }}
              </n-tag>
            </n-text>
            <n-text depth="2">
              {{ currentKeyCompleted.completed }} / {{ currentKeyCompleted.total }}
            </n-text>
          </div>
          <n-progress
            type="line"
            :percentage="currentKeyProgress"
            :status="currentKeyProgress === 100 ? 'success' : 'default'"
            :show-indicator="false"
            processing
          />
        </n-space>
      </n-card>

      <!-- 结果表格 -->
      <n-data-table
        :columns="resultColumns"
        :data="flatKeyResults"
        :max-height="scrollbarMaxHeight - 117 - 78"
        :bordered="false"
        :row-class-name="getRowClassName"
        :pagination="false"
      />
    </n-space>
  </div>

  <!-- 步骤 3：更新结果 -->
  <div v-if="batchStore.currentStep === 'result'">
    <n-data-table
      :columns="resultColumns"
      :data="flatKeyResults"
      :max-height="scrollbarMaxHeight - 78 - 24"
      :bordered="false"
      :row-class-name="getRowClassName"
      :pagination="false"
    />

    <div style="display: flex; justify-content: space-between; margin-top: 24px">
      <n-button
        v-if="flatKeyResults.some((r) => r.status === 'error')"
        type="warning"
        @click="handleRetryFailed"
      >
        重试失败项 ({{ flatKeyResults.filter((r) => r.status === "error").length }})
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
