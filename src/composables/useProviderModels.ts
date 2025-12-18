import type { ApiError } from "@/types/api";
import { handleApiError } from "@/utils/errorHandler";
import { useProviderState, type FormModel } from "./useProviderState";
import type { ApiKey } from "@/types/provider";

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
    currentFilteredKeyId,
  } = useProviderState();

  /**
   * 智能合并模型与密钥关联的结果
   */
  interface MergeModelsResult {
    mergedCount: number;
    addedCount: number;
    modelsToAdd: FormModel[];
  }

  /**
   * 智能合并模型与密钥关联
   * @param existingModels - 现有模型列表
   * @param newModelNames - 要导入的模型名称列表
   * @param keysToAdd - 要关联的密钥列表
   * @param createNewModel - 创建新模型的工厂函数（可选）
   * @returns 合并结果
   */
  const mergeModelsWithKeys = (
    existingModels: Array<{
      id: number;
      name: string;
      alias: string;
      api_keys?: ApiKey[];
      isDirty?: boolean;
      platform_id?: number;
    }>,
    newModelNames: string[],
    keysToAdd: Array<{ id: number; tempId?: string; platform_id: number; value: string }>,
    createNewModel?: (name: string) => FormModel
  ): MergeModelsResult => {
    const existingModelMap = new Map(existingModels.map((m) => [m.name.toLowerCase(), m]));

    let mergedCount = 0;
    let addedCount = 0;
    const modelsToAdd: FormModel[] = [];

    newModelNames.forEach((modelName) => {
      const existingModel = existingModelMap.get(modelName.toLowerCase());

      if (existingModel) {
        if (!existingModel.api_keys) {
          existingModel.api_keys = [];
        }

        keysToAdd.forEach((keyToAdd) => {
          const keyIdentifier = keyToAdd.tempId || String(keyToAdd.id);
          const isKeyAlreadyLinked = existingModel.api_keys!.some((k) => {
            const existingKeyIdentifier = k.tempId || String(k.id);
            return existingKeyIdentifier === keyIdentifier;
          });

          if (!isKeyAlreadyLinked) {
            existingModel.api_keys!.push({ ...keyToAdd });
            existingModel.isDirty = true;
            mergedCount++;
          }
        });
      } else {
        const newModel = createNewModel?.(modelName) ?? {
          id: -1,
          platform_id: 0,
          name: modelName,
          alias: "",
          api_keys: [...keysToAdd],
          isDirty: true,
        };
        modelsToAdd.push(newModel);
        addedCount++;
      }
    });

    return { mergedCount, addedCount, modelsToAdd };
  };

  /**
   * 根据筛选条件获取要关联的密钥列表
   */
  const getKeysToAddByFilter = (
    selectedKeyFilter: string | null,
    platformApiKeys: Array<{ id?: number | null; tempId?: string; value: string }>
  ): Array<{ id: number; tempId?: string; platform_id: number; value: string }> => {
    if (selectedKeyFilter === null || selectedKeyFilter === "") {
      return platformApiKeys.map((key) => ({
        id: key.id || 0,
        tempId: key.tempId,
        platform_id: 0,
        value: "",
      }));
    }

    const selectedKey = platformApiKeys.find(
      (key) => (key.tempId || (key.id ? String(key.id) : null)) === selectedKeyFilter
    );

    if (selectedKey) {
      return [
        {
          id: selectedKey.id || 0,
          tempId: selectedKey.tempId,
          platform_id: 0,
          value: "",
        },
      ];
    }

    return [];
  };

  /**
   * 显示合并结果消息
   */
  const showMergeResultMessage = (
    mergedCount: number,
    addedCount: number,
    action: "导入" | "获取"
  ) => {
    if (mergedCount > 0 && addedCount > 0) {
      message.success(
        `成功${action} ${addedCount} 个新模型，合并了 ${mergedCount} 个已有模型的密钥关联`
      );
    } else if (mergedCount > 0) {
      message.success(`成功合并了 ${mergedCount} 个已有模型的密钥关联`);
    } else if (addedCount > 0) {
      message.success(`成功${action} ${addedCount} 个新模型`);
    } else {
      message.info("所有模型都已存在且已关联相应密钥");
    }
  };

  // 移除模型或解除密钥关联
  const removeModel = (index: number, keyIdentifier: string | null = null) => {
    if (!currentProvider.value) return;

    const model = currentProvider.value.models[index];

    if (keyIdentifier === null) {
      // 完全删除模型
      if (model.id > 0) {
        if (!currentProvider.value.deletedModelIds) {
          currentProvider.value.deletedModelIds = [];
        }
        currentProvider.value.deletedModelIds.push(model.id);
      }
      currentProvider.value.models.splice(index, 1);
    } else {
      // 只解除模型与指定密钥的关联（支持 id 和 tempId）
      if (model.api_keys && model.api_keys.length > 0) {
        const updatedApiKeys = model.api_keys.filter((key) => {
          const currentKeyIdentifier = key.tempId || (key.id ? String(key.id) : null);
          return currentKeyIdentifier !== keyIdentifier;
        });

        model.api_keys = updatedApiKeys;
        model.isDirty = true;

        // 🆕 如果模型没有任何密钥关联，则删除该模型
        if (updatedApiKeys.length === 0) {
          if (model.id > 0) {
            if (!currentProvider.value.deletedModelIds) {
              currentProvider.value.deletedModelIds = [];
            }
            currentProvider.value.deletedModelIds.push(model.id);
          }
          currentProvider.value.models.splice(index, 1);
          message.info(`模型 "${model.name || "未命名"}" 已被删除（无关联密钥）`);
        }
      }
    }
  };

  // 添加模型行
  const addModelRow = (selectedKeyFilter: string | null = "") => {
    if (!currentProvider.value) return;

    const platformApiKeys = currentProvider.value.apiKeys || [];
    let defaultApiKeys: Array<{ id: number; tempId?: string; platform_id: number; value: string }> =
      [];

    // 场景 1: 选择"全部"或未筛选 - 关联所有密钥（包括新密钥）
    if (selectedKeyFilter === null || selectedKeyFilter === "") {
      defaultApiKeys = platformApiKeys.map((key) => ({
        id: key.id || 0, // 修复：确保 id 始终为 number 类型
        tempId: key.tempId,
        platform_id: 0,
        value: "",
      }));
    }
    // 场景 2: 选择了特定密钥 - 只关联该密钥
    else {
      const selectedKey = platformApiKeys.find(
        (key) => (key.tempId || (key.id ? String(key.id) : null)) === selectedKeyFilter
      );

      if (selectedKey) {
        defaultApiKeys = [
          {
            id: selectedKey.id || 0, // 修复：确保 id 始终为 number 类型
            tempId: selectedKey.tempId,
            platform_id: 0,
            value: "",
          },
        ];
      }
    }

    currentProvider.value.models.push({
      id: -1,
      name: "",
      alias: "",
      api_keys: defaultApiKeys,
      isDirty: true,
    });
  };

  // 从剪切板导入模型（智能合并逻辑）
  const handleImportFromClipboard = (
    modelNames: string[],
    selectedKeyFilter: string | null = ""
  ) => {
    if (!currentProvider.value) {
      message.error("导入失败：当前供应商信息为空");
      return;
    }

    const keysToAdd = getKeysToAddByFilter(selectedKeyFilter, currentProvider.value.apiKeys || []);
    const { mergedCount, addedCount, modelsToAdd } = mergeModelsWithKeys(
      currentProvider.value.models,
      modelNames,
      keysToAdd
    );

    if (modelsToAdd.length > 0) {
      currentProvider.value.models.push(...modelsToAdd);
    }

    showMergeResultMessage(mergedCount, addedCount, "导入");
  };

  // 从剪切板导入模型并关联到指定密钥
  const handleImportFromClipboardByKey = (modelNames: string[], keyId: number) => {
    if (!currentProvider.value) {
      message.error("导入失败：当前供应商信息为空");
      return;
    }

    // 构造要关联的密钥列表（只包含指定的密钥）
    const keysToAdd = [
      {
        id: keyId,
        platform_id: 0,
        value: "",
      },
    ];

    // 使用公共合并逻辑
    const { mergedCount, addedCount, modelsToAdd } = mergeModelsWithKeys(
      currentProvider.value.models,
      modelNames,
      keysToAdd
    );

    if (modelsToAdd.length > 0) {
      currentProvider.value.models.push(...modelsToAdd);
    }

    showMergeResultMessage(mergedCount, addedCount, "导入");
  };

  // 使用指定密钥从供应商获取模型列表
  const handleFetchModelsByKey = async (keyInfo: {
    id: number;
    tempId?: string;
    value: string;
  }) => {
    if (!activeServer.value) {
      message.warning("请先选择一个 API 服务器");
      return;
    }

    if (!currentProvider.value) {
      message.error("获取模型失败：当前供应商信息为空");
      return;
    }

    try {
      const fetchedModels = await store.fetchModelsFromProviderByKey(keyInfo.value, keyInfo);

      if (
        currentProvider.value.models.length > 0 &&
        currentProvider.value.models.some((m) => m.id > 0)
      ) {
        // 只过滤属于该密钥的现有模型
        // 使用 tempId 或 id 来匹配密钥
        const keyIdentifier = keyInfo.tempId || String(keyInfo.id);
        const existingModelsForKey = currentProvider.value.models.filter((m) =>
          m.api_keys?.some((k) => {
            const modelKeyIdentifier = k.tempId || String(k.id);
            return modelKeyIdentifier === keyIdentifier;
          })
        );

        if (existingModelsForKey.length === 0) {
          // 该密钥没有现有模型，需要智能合并
          const keysToAdd = [
            {
              id: keyInfo.id,
              tempId: keyInfo.tempId,
              platform_id: 0,
              value: "",
            },
          ];

          const fetchedModelNames = fetchedModels.map((m) => m.name);
          const { mergedCount, addedCount, modelsToAdd } = mergeModelsWithKeys(
            currentProvider.value.models,
            fetchedModelNames,
            keysToAdd,
            (name: string) => {
              const originalModel = fetchedModels.find((m) => m.name === name);
              return (
                originalModel || {
                  id: -1,
                  platform_id: 0,
                  name,
                  alias: "",
                  api_keys: keysToAdd,
                  isDirty: true,
                }
              );
            }
          );

          if (modelsToAdd.length > 0) {
            currentProvider.value.models.push(...modelsToAdd);
          }

          showMergeResultMessage(mergedCount, addedCount, "获取");
        } else {
          // 显示差异对比，记录当前操作的密钥 ID（优先使用 id，否则使用 0）
          currentFilteredKeyId.value = keyInfo.id;
          newFetchedModels.value = fetchedModels as FormModel[];
          showDiffModal.value = true;
        }
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
      currentFilteredKeyId.value = null;
      return;
    }

    if (!currentProvider.value || !editingProviderId.value) {
      message.error("无法执行模型变更：当前供应商信息为空");
      showDiffModal.value = false;
      currentFilteredKeyId.value = null;
      return;
    }

    try {
      // 智能合并模型列表
      if (currentFilteredKeyId.value !== null) {
        // 场景：针对特定密钥的模型获取
        const keyId = currentFilteredKeyId.value;

        // 1. 保留不属于该密钥的所有现有模型
        const otherKeyModels = currentProvider.value.models.filter(
          (m) => !m.api_keys?.some((k) => k.id === keyId)
        );

        // 2. 合并：其他密钥的模型 + 该密钥选中的新模型
        currentProvider.value.models = [...otherKeyModels, ...selectedModels];

        // 3. 处理删除：只标记属于该密钥的被删除模型
        if (removedModels.length > 0) {
          for (const model of removedModels) {
            if (model.id > 0) {
              // 检查模型是否还关联其他密钥
              const hasOtherKeys = model.api_keys?.some((k) => k.id !== keyId);

              if (!hasOtherKeys) {
                // 没有其他密钥关联，完全删除
                if (!currentProvider.value.deletedModelIds) {
                  currentProvider.value.deletedModelIds = [];
                }
                currentProvider.value.deletedModelIds.push(model.id);
              }
              // 如果有其他密钥，只解除该密钥的关联（通过不包含在 selectedModels 中来实现）
            }
          }
        }

        const newModelsCount = selectedModels.filter((m) => m.id === -1).length;
        message.success(`模型变更成功，该密钥新增了 ${newModelsCount} 个模型`);
      } else {
        // 场景：全局模型获取（原有逻辑）
        const { addedCount, removedCount } = await store.applyModelChanges(
          editingProviderId.value,
          selectedModels,
          removedModels
        );

        // 刷新当前供应商的模型列表
        await store.fetchModelsByProviderId(editingProviderId.value);
        message.success(`模型变更成功，新增了 ${addedCount} 个模型，删除了 ${removedCount} 个模型`);
      }
    } catch (error) {
      message.error(handleApiError(error, "应用模型变更"));
    } finally {
      showDiffModal.value = false;
      currentFilteredKeyId.value = null; // 重置过滤密钥状态
    }
  };

  // 取消模型差异更新
  const handleModelDiffCancel = () => {
    showDiffModal.value = false;
    currentFilteredKeyId.value = null; // 重置过滤密钥状态
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
