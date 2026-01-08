<script setup lang="ts">
import { useProviderState, type FormModel } from "@/composables/useProviderState";
import { useProviderActions } from "@/composables/useProviderActions";
import { useProviderModels } from "@/composables/useProviderModels";

// 状态管理
const {
  providers,
  isLoading,
  currentProvider,
  showRenameModal,
  showDiffModal,
  showBatchImportModal,
  newFetchedModels,
  currentFilteredKeyId,
} = useProviderState();

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
</script>

<template>
  <ProviderTable
    :providers="providers"
    :is-loading="isLoading"
    @delete="handleDelete"
    @batch-import="showBatchImportModal = true"
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
</template>
