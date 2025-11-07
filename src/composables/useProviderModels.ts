import type { ApiError } from "@/types/api";
import { handleApiError } from "@/utils/errorHandler";
import { useProviderState, type FormModel } from "./useProviderState";

/**
 * Provider 模型管理相关操作
 */
export function useProviderModels() {
  const {
    store,
    activeServer,
    message,
    currentProvider,
    editingProviderId,
    showDiffModal,
    newFetchedModels,
  } = useProviderState();

  // 移除模型或解除密钥关联
  const removeModel = (index: number, keyId: number | null = null) => {
    if (currentProvider.value) {
      const model = currentProvider.value.models[index];

      if (keyId === null) {
        // 完全删除模型
        // 如果是已保存的模型（id > 0），记录到 deletedModelIds
        if (model.id > 0) {
          if (!currentProvider.value.deletedModelIds) {
            currentProvider.value.deletedModelIds = [];
          }
          currentProvider.value.deletedModelIds.push(model.id);
        }
        // 从列表中移除
        currentProvider.value.models.splice(index, 1);
      } else {
        // 只解除模型与指定密钥的关联
        if (model.api_keys && model.api_keys.length > 0) {
          const updatedApiKeys = model.api_keys.filter((key) => key.id !== keyId);
          model.api_keys = updatedApiKeys;
          model.isDirty = true;
        }
      }
    }
  };

  // 添加模型行
  const addModelRow = () => {
    if (currentProvider.value) {
      // 新模型默认关联所有平台密钥
      const platformApiKeys = currentProvider.value.apiKeys || [];
      const defaultApiKeys = platformApiKeys
        .filter((key) => key.id && key.id > 0)
        .map((key) => ({
          id: key.id!,
          platform_id: 0, // 临时值
          value: "", // 不返回实际值
        }));

      currentProvider.value.models.push({
        id: -1, // 临时 ID
        name: "",
        alias: "",
        api_keys: defaultApiKeys, // 默认关联所有密钥
        isDirty: true, // 新模型默认需要保存
      });
    }
  };

  // 从剪切板导入模型
  const handleImportFromClipboard = (modelNames: string[]) => {
    if (!currentProvider.value) {
      message.error("导入失败：当前供应商信息为空");
      return;
    }

    // 过滤掉已存在的模型名称
    const existingModelNames = new Set(
      currentProvider.value.models.map((m) => m.name.toLowerCase())
    );
    const newModelNames = modelNames.filter((name) => !existingModelNames.has(name.toLowerCase()));

    if (newModelNames.length === 0) {
      message.warning("所有模型都已存在，未添加新模型");
      return;
    }

    // 添加新模型，默认关联所有平台密钥
    const platformApiKeys = currentProvider.value.apiKeys || [];
    const defaultApiKeys = platformApiKeys
      .filter((key) => key.id && key.id > 0)
      .map((key) => ({
        id: key.id!,
        platform_id: 0, // 临时值
        value: "", // 不返回实际值
      }));

    const newModels = newModelNames.map((name) => ({
      id: -1, // 临时 ID
      name,
      alias: "",
      api_keys: defaultApiKeys, // 默认关联所有密钥
      isDirty: true, // 新模型默认需要保存
    }));

    currentProvider.value.models.push(...newModels);

    if (newModelNames.length < modelNames.length) {
      const skippedCount = modelNames.length - newModelNames.length;
      message.success(
        `成功导入 ${newModelNames.length} 个模型，跳过 ${skippedCount} 个已存在的模型`
      );
    }
  };

  // 从剪切板导入模型并关联到指定密钥
  const handleImportFromClipboardByKey = (modelNames: string[], keyId: number) => {
    if (!currentProvider.value) {
      message.error("导入失败：当前供应商信息为空");
      return;
    }

    // 过滤掉已存在的模型名称
    const existingModelNames = new Set(
      currentProvider.value.models.map((m) => m.name.toLowerCase())
    );
    const newModelNames = modelNames.filter((name) => !existingModelNames.has(name.toLowerCase()));

    if (newModelNames.length === 0) {
      message.warning("所有模型都已存在，未添加新模型");
      return;
    }

    // 添加新模型，只关联到指定的密钥
    const newModels = newModelNames.map((name) => ({
      id: -1, // 临时 ID
      name,
      alias: "",
      api_keys: [
        {
          id: keyId,
          platform_id: 0,
          value: "",
        },
      ],
      isDirty: true, // 新模型默认需要保存
    }));

    currentProvider.value.models.push(...newModels);

    if (newModelNames.length < modelNames.length) {
      const skippedCount = modelNames.length - newModelNames.length;
      message.success(
        `成功导入 ${newModelNames.length} 个模型，跳过 ${skippedCount} 个已存在的模型`
      );
    } else {
      message.success(`成功导入 ${newModelNames.length} 个模型`);
    }
  };

  // 使用指定密钥从供应商获取模型列表
  const handleFetchModelsByKey = async (keyId: number, keyValue: string) => {
    if (!activeServer.value) {
      message.warning("请先选择一个 API 服务器");
      return;
    }

    if (!currentProvider.value) {
      message.error("获取模型失败：当前供应商信息为空");
      return;
    }

    try {
      const fetchedModels = await store.fetchModelsFromProviderByKey(keyValue, keyId);

      if (
        currentProvider.value.models.length > 0 &&
        currentProvider.value.models.some((m) => m.id > 0)
      ) {
        newFetchedModels.value = fetchedModels as FormModel[];
        showDiffModal.value = true;
      } else {
        currentProvider.value.models = fetchedModels;
        message.success(`模型获取成功，新增了 ${fetchedModels.length} 个模型`);
      }
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.isTimeout) {
        message.error("获取模型失败：请求超时，请检查网络连接和供应商配置");
      } else if (apiError.status === 401) {
        message.error("获取模型失败：API 密钥无效或权限不足，请检查 API 密钥");
      } else if (apiError.status === 404) {
        message.error("获取模型失败：无法连接到供应商，请检查 API 端点地址是否正确");
      } else if (apiError.status && apiError.status >= 500) {
        message.error("获取模型失败：供应商服务器内部错误，请稍后重试");
      } else if (apiError.status && apiError.status >= 400) {
        let detail = `请检查 API 密钥和基础 URL 配置`;
        if (apiError.body) {
          try {
            const body = JSON.parse(apiError.body);
            if (body.error && body.error.message) {
              detail = body.error.message;
            }
          } catch {
            detail = apiError.body ?? "";
          }
        }
        message.error(`获取模型失败 (${apiError.status})：${detail}`);
      } else if (error instanceof Error) {
        message.error(`获取模型失败：${error.message}`);
      } else {
        message.error("获取模型失败：发生未知错误");
      }
    }
  };

  // 处理模型差异确认
  const handleModelDiffConfirm = async (
    selectedModels: FormModel[],
    removedModels: FormModel[]
  ) => {
    // 检查是否选择了服务器
    if (!activeServer.value) {
      message.warning("请先选择一个 API 服务器");
      showDiffModal.value = false;
      return;
    }

    if (!currentProvider.value || !editingProviderId.value) {
      message.error("无法执行模型变更：当前供应商信息为空");
      showDiffModal.value = false;
      return;
    }

    try {
      // 执行实际的模型变更操作并获取计数
      const { addedCount, removedCount } = await store.applyModelChanges(
        editingProviderId.value,
        selectedModels,
        removedModels
      );

      // 刷新当前供应商的模型列表
      await store.fetchModelsByProviderId(editingProviderId.value);
      message.success(`模型变更成功，新增了 ${addedCount} 个模型，删除了 ${removedCount} 个模型`);
    } catch (error) {
      message.error(handleApiError(error, "获取模型"));
    } finally {
      showDiffModal.value = false;
    }
  };

  // 取消模型差异更新
  const handleModelDiffCancel = () => {
    showDiffModal.value = false;
  };

  return {
    removeModel,
    addModelRow,
    handleFetchModelsByKey,
    handleModelDiffConfirm,
    handleModelDiffCancel,
    handleImportFromClipboard,
    handleImportFromClipboardByKey,
  };
}
