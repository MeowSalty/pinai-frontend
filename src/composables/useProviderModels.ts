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

  // 移除模型
  const removeModel = (index: number) => {
    if (currentProvider.value) {
      const model = currentProvider.value.models[index];
      // 如果是已保存的模型（id > 0），记录到 deletedModelIds
      if (model.id > 0) {
        if (!currentProvider.value.deletedModelIds) {
          currentProvider.value.deletedModelIds = [];
        }
        currentProvider.value.deletedModelIds.push(model.id);
      }
      // 从列表中移除
      currentProvider.value.models.splice(index, 1);
    }
  };

  // 添加模型行
  const addModelRow = () => {
    if (currentProvider.value) {
      currentProvider.value.models.push({
        id: -1, // 临时 ID
        name: "",
        alias: "",
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

    // 添加新模型
    const newModels = newModelNames.map((name) => ({
      id: -1, // 临时 ID
      name,
      alias: "",
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

  // 从供应商获取模型列表
  const handleFetchModels = async () => {
    // 检查是否选择了服务器
    if (!activeServer.value) {
      message.warning("请先选择一个 API 服务器");
      return;
    }

    if (!currentProvider.value) {
      message.error("获取模型失败：当前供应商信息为空");
      return;
    }

    try {
      // 获取模型数据而不是直接更新
      const fetchedModels = await store.fetchModelsFromProviderOnly();

      // 检查是否需要显示差异对比
      if (
        currentProvider.value.models.length > 0 &&
        currentProvider.value.models.some((m) => m.id > 0)
      ) {
        // 如果已有模型且至少有一个是已保存的模型（id > 0），则显示差异对比
        newFetchedModels.value = fetchedModels as FormModel[];
        showDiffModal.value = true;
      } else {
        // 如果模型列表为空或都是新增的模型，则直接替换
        currentProvider.value.models = fetchedModels;
        const newModelsCount = fetchedModels.length;
        message.success(`模型获取成功，新增了 ${newModelsCount} 个模型`);
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
        // 尝试解析 body 获取更详细的错误信息
        let detail = `请检查 API 密钥和基础 URL 配置`;
        if (apiError.body) {
          try {
            const body = JSON.parse(apiError.body);
            if (body.error && body.error.message) {
              detail = body.error.message;
            }
          } catch {
            // 如果 body 不是 JSON，直接使用原始 body
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
    handleFetchModels,
    handleModelDiffConfirm,
    handleModelDiffCancel,
    handleImportFromClipboard,
  };
}
