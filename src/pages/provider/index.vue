<script setup lang="ts">
import { useProviderState, type FormModel } from "@/composables/useProviderState";
import { useProviderActions } from "@/composables/useProviderActions";
import { useProviderModels } from "@/composables/useProviderModels";
import { useProviderBatchUpdate } from "@/composables/useProviderBatchUpdate";

// 状态管理
const {
  providers,
  isLoading,
  currentProvider,
  // store,
  showRenameModal,
  showDiffModal,
  showBatchImportModal,
  showBatchUpdateModal,
  showBatchResultModal,
  showBatchDiffModal,
  newFetchedModels,
  currentFilteredKeyId,
  currentBatchDiffProvider,
  selectedProvidersForBatch,
  batchUpdateResults,
} = useProviderState();

// 获取 isFetchingModels 状态
// const { isFetchingModels } = storeToRefs(store);

// 计算用于差异对比的现有模型列表
const existingModelsForDiff = computed(() => {
  if (currentFilteredKeyId.value !== null && currentProvider.value) {
    // 只返回属于当前操作密钥的模型
    // 支持通过 tempId 或 id 筛选
    return currentProvider.value.models.filter((m) =>
      m.api_keys?.some((k) => {
        const keyIdentifier = k.tempId || String(k.id);
        return keyIdentifier === String(currentFilteredKeyId.value);
      })
    ) as FormModel[];
  }
  // 返回所有模型
  return (currentProvider.value?.models || []) as FormModel[];
});

// 基础操作
const { handleDelete, handleBatchImportSuccess, handleEnableHealth, handleDisableHealth } =
  useProviderActions();

// 模型管理
const { handleModelDiffConfirm, handleModelDiffCancel } = useProviderModels();

// 批量更新
const {
  handleBatchUpdateModels,
  handleConfirmBatchUpdate,
  handleCancelBatchUpdate,
  handleBatchDiffConfirm,
  handleBatchDiffCancel,
  handleRetryFailedItems,
  handleCloseBatchResult,
} = useProviderBatchUpdate();
</script>

<template>
  <ProviderTable
    :providers="providers"
    :is-loading="isLoading"
    @delete="handleDelete"
    @batch-import="showBatchImportModal = true"
    @batch-update-models="handleBatchUpdateModels"
    @enable-health="handleEnableHealth"
    @disable-health="handleDisableHealth"
  />

  <!-- 模型重命名模态框 -->
  <n-modal
    v-model:show="showRenameModal"
    preset="card"
    style="width: 800px; max-height: 80vh"
    title="模型自动重命名"
    content-style="overflow: auto;"
  >
    <ModelRenameManager
      v-if="currentProvider"
      :models="(currentProvider.models as unknown) as FormModel[]"
      @update:models="currentProvider.models = $event"
    />
  </n-modal>

  <!-- 模型差异查看模态框 -->
  <n-modal
    v-model:show="showDiffModal"
    preset="card"
    style="width: 800px; max-height: 80vh"
    title="模型变更确认"
    content-style="overflow: auto;"
  >
    <ModelDiffViewer
      v-if="currentProvider"
      :existing-models="existingModelsForDiff"
      :new-models="newFetchedModels"
      @confirm="handleModelDiffConfirm"
      @cancel="handleModelDiffCancel"
    />
  </n-modal>

  <!-- 批量更新中的模型差异查看模态框 -->
  <n-modal
    v-model:show="showBatchDiffModal"
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
      :existing-models="(currentProvider.models as unknown) as FormModel[]"
      :new-models="newFetchedModels"
      @confirm="handleBatchDiffConfirm"
      @cancel="handleBatchDiffCancel"
    />
  </n-modal>

  <!-- 批量导入模态框 -->
  <n-modal
    v-model:show="showBatchImportModal"
    preset="card"
    style="width: 800px"
    title="批量导入供应商"
  >
    <BatchImportProviders
      @close="showBatchImportModal = false"
      @import-success="handleBatchImportSuccess"
    />
  </n-modal>

  <!-- 批量更新模型确认弹窗 -->
  <n-modal
    v-model:show="showBatchUpdateModal"
    preset="card"
    style="width: 600px; max-height: 80vh"
    title="批量更新模型"
  >
    <BatchUpdateModelsModal
      :selected-providers="selectedProvidersForBatch"
      @confirm="handleConfirmBatchUpdate"
      @cancel="handleCancelBatchUpdate"
    />
  </n-modal>

  <!-- 批量更新结果弹窗 -->
  <n-modal
    v-model:show="showBatchResultModal"
    preset="card"
    style="width: 700px; max-height: 70vh"
    title="批量更新结果"
    :mask-closable="false"
    :closable="false"
  >
    <div>
      <n-scrollbar style="max-height: 300px">
        <n-list bordered>
          <n-list-item v-for="result in batchUpdateResults" :key="result.provider.id">
            <div style="display: flex; align-items: center; justify-content: space-between">
              <div style="flex: 1">
                <div style="font-weight: 500; margin-bottom: 4px">
                  {{ result.provider.name }}
                </div>
                <div v-if="result.status === 'success'" style="font-size: 12px; color: #18a058">
                  成功 - 新增 {{ result.addedCount ?? 0 }} 个，删除
                  {{ result.removedCount ?? 0 }} 个
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

      <div style="display: flex; justify-content: space-between; margin-top: 24px">
        <n-button
          v-if="
            batchUpdateResults.some((r) => r.status === 'error') &&
            !batchUpdateResults.some((r) => r.status === 'pending')
          "
          type="warning"
          @click="handleRetryFailedItems"
        >
          重试失败项 ({{ batchUpdateResults.filter((r) => r.status === "error").length }})
        </n-button>
        <div v-else></div>
        <n-button
          type="primary"
          @click="handleCloseBatchResult"
          :disabled="batchUpdateResults.some((r) => r.status === 'pending')"
        >
          完成
        </n-button>
      </div>
    </div>
  </n-modal>
</template>
