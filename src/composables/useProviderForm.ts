import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useProviderState } from "@/composables/useProviderState";
import { useProviderActions } from "@/composables/useProviderActions";
import { useProviderModels } from "@/composables/useProviderModels";
import { providerApi } from "@/services/providerApi";
import { handleApiError } from "@/utils/errorHandler";

/**
 * 供应商表单页面的公共逻辑
 * 用于 add.vue 和 [id].edit.vue 页面
 */
export function useProviderForm() {
  const router = useRouter();

  // 状态管理
  const {
    currentProvider,
    isApiKeyDirty,
    isLoading,
    formMode,
    store,
    message,
    showRenameModal,
    showDiffModal,
    newFetchedModels,
    currentFilteredKeyId,
    apiFormatOptions,
    getVariantOptions,
  } = useProviderState();

  // 获取 isFetchingModels 和 editingProviderId 状态
  const { isFetchingModels, editingProviderId } = storeToRefs(store);

  // 基础操作
  const { handleSubmit, handleRemoveApiKey } = useProviderActions();

  // 模型管理
  const {
    removeModel,
    addModelRow,
    handleFetchModelsByKey,
    handleModelDiffConfirm,
    handleModelDiffCancel,
    handleImportFromClipboard,
    handleImportFromClipboardByKey,
  } = useProviderModels();

  // 计算用于差异对比的现有模型列表
  const existingModelsForDiff = computed(() => {
    if (currentFilteredKeyId.value !== null && currentProvider.value) {
      return currentProvider.value.models.filter((m) =>
        m.api_keys?.some((k) => {
          const keyIdentifier = k.tempId || String(k.id);
          return keyIdentifier === String(currentFilteredKeyId.value);
        })
      );
    }
    return currentProvider.value?.models || [];
  });

  // 处理取消
  const handleCancel = () => {
    router.push("/provider");
  };

  // 处理提交成功
  const handleSuccess = () => {
    router.push("/provider");
  };

  // 处理模型健康状态启用
  const handleEnableModelHealth = async (modelId: number) => {
    if (!editingProviderId.value) {
      message.error("无法启用模型健康状态：未找到供应商 ID");
      return;
    }

    try {
      await providerApi.enableModelHealth(editingProviderId.value, modelId);
      message.success("模型健康状态已启用");
      // 重新加载模型列表以更新健康状态
      await store.loadModelsByProviderId(editingProviderId.value);
    } catch (error) {
      message.error(handleApiError(error, "启用模型健康状态失败"));
    }
  };

  // 处理模型健康状态禁用
  const handleDisableModelHealth = async (modelId: number) => {
    if (!editingProviderId.value) {
      message.error("无法禁用模型健康状态：未找到供应商 ID");
      return;
    }

    try {
      await providerApi.disableModelHealth(editingProviderId.value, modelId);
      message.success("模型健康状态已禁用");
      // 重新加载模型列表以更新健康状态
      await store.loadModelsByProviderId(editingProviderId.value);
    } catch (error) {
      message.error(handleApiError(error, "禁用模型健康状态失败"));
    }
  };

  // 重写提交处理，添加成功后跳转
  const handleSubmitWithRedirect = async () => {
    await handleSubmit();
    // 提交成功后跳转回列表
    handleSuccess();
  };

  return {
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
    currentFilteredKeyId,
    apiFormatOptions,
    getVariantOptions,
    existingModelsForDiff,

    // 方法
    handleSubmitWithRedirect,
    handleCancel,
    handleRemoveApiKey,
    removeModel,
    addModelRow,
    handleFetchModelsByKey,
    handleModelDiffConfirm,
    handleModelDiffCancel,
    handleImportFromClipboard,
    handleImportFromClipboardByKey,
    handleEnableModelHealth,
    handleDisableModelHealth,
  };
}
