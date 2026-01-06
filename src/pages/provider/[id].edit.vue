<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useRoute } from "vue-router/auto";
import type { ProviderUpdateRequest } from "@/types/provider";
import { useProviderForm } from "@/composables/useProviderForm";
import { useApiServerCheck } from "@/composables/useApiServerCheck";
import { handleApiError } from "@/utils/errorHandler";

definePage({
  meta: {
    title: "编辑供应商",
  },
});

const router = useRouter();
const route = useRoute("/provider/[id].edit");
const { checkApiServer } = useApiServerCheck();

// 使用共享的表单逻辑
const {
  // 状态
  currentProvider,
  isApiKeyDirty,
  isLoading,
  isFetchingModels,
  formMode,
  store,
  message,
  showRenameModal,
  showDiffModal,
  newFetchedModels,
  apiFormatOptions,
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
  handleEnableModelHealth,
  handleDisableModelHealth,
} = useProviderForm();

// 加载供应商数据
onMounted(async () => {
  // 设置为编辑模式
  formMode.value = "edit";

  if (!checkApiServer()) {
    router.push("/provider");
    return;
  }

  const id = Number(route.params.id);
  if (isNaN(id)) {
    message.error("无效的供应商 ID");
    router.push("/provider");
    return;
  }

  try {
    // 1. 加载供应商基本信息
    await store.loadProviderForEdit(id);

    // 2. 加载供应商密钥信息
    try {
      await store.loadProviderApiKey(id);
    } catch (error) {
      console.warn("加载供应商密钥失败，将使用空密钥：", error);
    }

    // 3. 获取该供应商已保存的模型列表
    await store.loadModelsByProviderId(id);
  } catch (error) {
    message.error(handleApiError(error, "加载供应商数据"));
    router.push("/provider");
  }
});
</script>

<template>
  <ProviderFormContent
    v-if="currentProvider"
    :provider="currentProvider"
    form-mode="edit"
    :is-loading="isLoading"
    :is-api-key-dirty="isApiKeyDirty"
    :is-fetching-models="isFetchingModels"
    :api-format-options="apiFormatOptions"
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
    @enable-model-health="handleEnableModelHealth"
    @disable-model-health="handleDisableModelHealth"
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
