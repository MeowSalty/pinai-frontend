<script setup lang="ts">
import { onMounted } from "vue";
import type { ProviderUpdateRequest } from "@/types/provider";
import { useProviderForm } from "@/composables/useProviderForm";
import { useApiServerCheck } from "@/composables/useApiServerCheck";

definePage({
  meta: {
    title: "添加供应商",
  },
});

const { checkApiServer } = useApiServerCheck();

// 使用共享的表单逻辑
const {
  // 状态
  currentProvider,
  isApiKeyDirty,
  isLoading,
  isFetchingModels,
  store,
  showRenameModal,
  showDiffModal,
  newFetchedModels,
  apiFormatOptions,
  getVariantOptions,
  existingModelsForDiff,

  // 方法
  handleCancel,
  handleSubmitWithRedirect,
  handleRemoveApiKey,
  addModelRow,
  removeModel,
  handleFetchModelsByKey,
  handleModelDiffConfirm,
  handleModelDiffCancel,
  handleImportFromClipboard,
  handleImportFromClipboardByKey,
} = useProviderForm();

// 初始化新供应商数据
onMounted(() => {
  if (!checkApiServer()) {
    return;
  }

  // 初始化空白供应商
  store.initNewProvider();
});
</script>

<template>
  <ProviderFormContent
    v-if="currentProvider"
    :provider="currentProvider"
    form-mode="add"
    :is-loading="isLoading"
    :is-api-key-dirty="isApiKeyDirty"
    :is-fetching-models="isFetchingModels"
    :api-format-options="apiFormatOptions"
    :variant-options="getVariantOptions(currentProvider.platform.provider)"
    @submit="handleSubmitWithRedirect"
    @cancel="handleCancel"
    @update:provider="(value: ProviderUpdateRequest) => (currentProvider = value)"
    @mark-api-key-dirty="store.markApiKeyAsDirty"
    @add-model="addModelRow"
    @remove-model="removeModel"
    @remove-api-key="handleRemoveApiKey"
    @fetch-models-by-key="handleFetchModelsByKey"
    @open-rename-modal="showRenameModal = true"
    @import-from-clipboard="handleImportFromClipboard"
    @import-from-clipboard-by-key="handleImportFromClipboardByKey"
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
      :models="currentProvider.models"
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
</template>
