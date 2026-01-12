import type { Platform } from "@/types/provider";
import { providerApi } from "@/services/providerApi";
import {
  useProviderState,
  type FormModel,
  type KeyFetchResult,
  type MergedModel,
} from "./useProviderState";
import type { BatchUpdateResult } from "@/stores/batchUpdateStore";

/**
 * Provider 批量更新相关操作
 */
export function useProviderBatchUpdate() {
  const {
    store,
    currentProvider,
    showBatchDiffModal,
    currentBatchDiffProvider,
    newFetchedModels,
    currentKeyFetchResults,
    batchDiffResolve,
  } = useProviderState();

  /**
   * 脱敏显示 API 密钥
   */
  const maskApiKey = (key: string): string => {
    if (!key || key.length <= 8) return "***";
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  /**
   * 合并多个密钥获取到的模型
   * 同名模型会被合并，保留所有密钥的关联
   */
  const mergeModelsByKey = (
    keyResults: KeyFetchResult[],
    existingModels: Array<{
      id: number;
      name: string;
      alias: string;
      platform_id?: number;
      api_keys?: Array<{ id: number }>;
    }>
  ): MergedModel[] => {
    const modelMap = new Map<string, MergedModel>();

    // 首先添加现有模型（保留其 ID）
    existingModels.forEach((model) => {
      const existingKeyIds = model.api_keys?.map((k) => k.id) || [];
      modelMap.set(model.name, {
        name: model.name,
        alias: model.alias || model.name,
        keyIds: existingKeyIds,
        isNew: false,
        id: model.id,
        platform_id: model.platform_id || 0,
      });
    });

    // 处理每个密钥获取到的模型
    keyResults.forEach((result) => {
      if (result.status === "success") {
        result.models.forEach((model) => {
          if (modelMap.has(model.name)) {
            // 同名模型，添加密钥关联
            const existing = modelMap.get(model.name)!;
            if (!existing.keyIds.includes(result.keyId)) {
              existing.keyIds.push(result.keyId);
            }
          } else {
            // 新模型
            modelMap.set(model.name, {
              name: model.name,
              alias: model.alias || model.name,
              keyIds: [result.keyId],
              isNew: true,
              platform_id: model.platform_id,
            });
          }
        });
      }
    });

    return Array.from(modelMap.values());
  };

  /**
   * 计算模型变更差异
   */
  const calculateModelDiff = (
    existingModels: Array<{
      id: number;
      name: string;
      alias: string;
      api_keys?: Array<{ id: number }>;
    }>,
    mergedNewModels: MergedModel[]
  ): {
    added: MergedModel[];
    removed: Array<{
      id: number;
      name: string;
      alias: string;
      api_keys?: Array<{ id: number }>;
    }>;
    updated: MergedModel[];
  } => {
    const existingMap = new Map(existingModels.map((m) => [m.name, m]));
    const newMap = new Map(mergedNewModels.map((m) => [m.name, m]));

    // 新增：新模型中有但现有模型中没有的
    const added = mergedNewModels.filter((m) => !existingMap.has(m.name));

    // 移除：现有模型中有但新模型中没有的，或者密钥列表为空的
    const removed = existingModels.filter((m) => {
      const newModel = newMap.get(m.name);
      return !newModel || newModel.keyIds.length === 0;
    });

    // 更新：模型存在但密钥关联发生变化的
    const updated = mergedNewModels.filter((m) => {
      if (!existingMap.has(m.name) || m.keyIds.length === 0) return false;
      const existing = existingMap.get(m.name)!;
      const existingKeyIds = new Set(existing.api_keys?.map((k) => k.id) || []);
      const newKeyIds = new Set(m.keyIds);

      // 检查密钥关联是否有变化
      if (existingKeyIds.size !== newKeyIds.size) return true;
      for (const keyId of newKeyIds) {
        if (!existingKeyIds.has(keyId)) return true;
      }
      return false;
    });

    return { added, removed, updated };
  };

  // 处理单个供应商的模型更新
  const processSingleProviderUpdate = async (
    provider: Platform,
    options: { autoRename: boolean; autoConfirm: boolean },
    results: BatchUpdateResult[]
  ) => {
    // 获取当前供应商的结果对象
    const currentResult = results.find((r) => r.provider.id === provider.id);

    // 1. 加载供应商信息
    await store.loadProviderForEdit(provider.id);

    // 2. 加载 API 密钥
    try {
      await store.loadProviderApiKey(provider.id);
    } catch (error) {
      console.warn("加载供应商密钥失败：", error);
    }

    // 3. 获取现有模型列表
    await store.loadModelsByProviderId(provider.id);

    const apiKeys = currentProvider.value?.apiKeys || [];

    // 4. 多密钥并行获取模型列表
    let keyResults: KeyFetchResult[] = [];

    if (apiKeys.length === 0) {
      // 没有密钥的情况（例如 Ollama），使用原有逻辑
      const fetchedModels = await store.fetchModelsFromProviderOnly();
      keyResults = [
        {
          keyId: 0, // 虚拟密钥 ID
          keyValue: "无需密钥",
          models: fetchedModels as FormModel[],
          status: "success",
        },
      ];
    } else {
      // 对每个密钥并行发起请求
      keyResults = await Promise.all(
        apiKeys.map(async (key) => {
          // 更新当前密钥状态为 pending
          if (currentResult) {
            currentResult.keyResults = [
              ...currentResult.keyResults.filter((kr) => kr.keyId !== (key.id || 0)),
              {
                keyId: key.id || 0,
                keyValue: maskApiKey(key.value),
                status: "pending" as const,
                modelCount: 0,
              },
            ];
          }

          try {
            const models = await store.fetchModelsFromProviderByKey(key.value, {
              id: key.id || 0,
              tempId: key.tempId,
            });

            // 更新密钥状态为成功
            if (currentResult) {
              const keyResultIndex = currentResult.keyResults.findIndex(
                (kr) => kr.keyId === (key.id || 0)
              );
              if (keyResultIndex !== -1) {
                currentResult.keyResults[keyResultIndex] = {
                  keyId: key.id || 0,
                  keyValue: maskApiKey(key.value),
                  status: "success" as const,
                  modelCount: models.length,
                };
              }
            }

            return {
              keyId: key.id || 0,
              keyValue: key.value,
              models: models as FormModel[],
              status: "success" as const,
            };
          } catch (error) {
            console.warn(`密钥 ${maskApiKey(key.value)} 获取模型失败：`, error);

            // 更新密钥状态为失败
            if (currentResult) {
              const keyResultIndex = currentResult.keyResults.findIndex(
                (kr) => kr.keyId === (key.id || 0)
              );
              if (keyResultIndex !== -1) {
                currentResult.keyResults[keyResultIndex] = {
                  keyId: key.id || 0,
                  keyValue: maskApiKey(key.value),
                  status: "error" as const,
                  error: error instanceof Error ? error.message : String(error),
                  modelCount: 0,
                };
              }
            }

            return {
              keyId: key.id || 0,
              keyValue: key.value,
              models: [],
              status: "error" as const,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        })
      );

      // 检查是否所有密钥都失败了
      const allFailed = keyResults.every((r) => r.status === "error");
      if (allFailed) {
        throw new Error("所有密钥获取模型均失败，请检查密钥是否有效");
      }
    }

    // 存储密钥结果到 BatchUpdateResult（如果还没有存储）
    if (currentResult && currentResult.keyResults.length === 0) {
      currentResult.keyResults = keyResults.map((kr) => ({
        keyId: kr.keyId,
        keyValue: maskApiKey(kr.keyValue),
        status: kr.status,
        error: kr.error,
        modelCount: kr.models.length,
      }));
    }

    // 5. 合并同名模型
    const existingModels = currentProvider.value?.models || [];
    const mergedModels = mergeModelsByKey(keyResults, existingModels);

    // 6. 如果启用自动重命名，应用重命名规则
    let modelsToProcess = mergedModels;
    if (options.autoRename) {
      const { applyRulesToName } = await import("@/utils/rename");
      const { useRenameRulesStore } = await import("@/stores/renameRulesStore");
      const renameStore = useRenameRulesStore();
      await renameStore.loadRules();

      modelsToProcess = modelsToProcess.map((model) => {
        const newAlias = applyRulesToName(model.name, renameStore.rules);
        return {
          ...model,
          alias: newAlias !== model.name ? newAlias : model.alias,
        };
      });
    }

    // 7. 判断是否需要显示 diff 界面
    const hasExistingModels =
      currentProvider.value &&
      currentProvider.value.models.length > 0 &&
      currentProvider.value.models.some((m) => m.id > 0);

    if (!options.autoConfirm && hasExistingModels) {
      // 计算差异
      const { added, removed, updated } = calculateModelDiff(existingModels, modelsToProcess);

      const hasChanges = added.length > 0 || removed.length > 0 || updated.length > 0;

      if (hasChanges) {
        // 有变更，弹出 diff 界面
        currentBatchDiffProvider.value = provider;
        // 存储按密钥分组的结果，供 UI 展示
        currentKeyFetchResults.value = keyResults;
        // 将 MergedModel 转换为 FormModel 用于现有的 diff 界面
        newFetchedModels.value = modelsToProcess
          .filter((m) => m.keyIds.length > 0) // 只包含有密钥关联的模型
          .map((m) => ({
            id: m.id || -1,
            platform_id: m.platform_id,
            name: m.name,
            alias: m.alias,
            isDirty: m.isNew,
            api_keys: m.keyIds.map((keyId) => ({
              id: keyId,
              platform_id: m.platform_id,
              value: "",
            })),
          }));
        showBatchDiffModal.value = true;

        // 等待用户确认
        const result = await new Promise<{
          confirmed: boolean;
          selectedModels?: FormModel[];
          removedModels?: FormModel[];
        }>((resolve) => {
          batchDiffResolve.value = resolve;
        });

        if (!result.confirmed) {
          throw new Error("用户取消模型变更确认");
        }

        // 用户已确认，使用确认后的模型列表
        if (result.selectedModels && result.removedModels) {
          // 应用模型变更（包括密钥关联）
          const { addedCount, removedCount } = await applyMergedModelChanges(
            provider.id,
            result.selectedModels,
            result.removedModels
          );

          const result_item = results.find((r) => r.provider.id === provider.id);
          if (result_item) {
            result_item.addedCount = addedCount;
            result_item.removedCount = removedCount;
          }

          return; // 已处理完成，直接返回
        }
      } else {
        // 无变更，直接标记为成功
        const result_item = results.find((r) => r.provider.id === provider.id);
        if (result_item) {
          result_item.addedCount = 0;
          result_item.removedCount = 0;
        }
        return; // 无变更，直接返回
      }
    }

    // 8. 自动应用变更
    if (currentProvider.value) {
      const { added, removed } = calculateModelDiff(existingModels, modelsToProcess);

      // 转换为 FormModel 格式并应用变更
      const addedFormModels = added
        .filter((m) => m.keyIds.length > 0)
        .map((m) => ({
          id: -1,
          platform_id: provider.id,
          name: m.name,
          alias: m.alias,
          isDirty: true,
          api_keys: m.keyIds.map((keyId) => ({
            id: keyId,
            platform_id: provider.id,
            value: "",
          })),
        }));

      const removedFormModels = removed.map((m) => ({
        id: m.id,
        platform_id: provider.id,
        name: m.name,
        alias: m.alias,
        isDirty: false,
        api_keys: m.api_keys?.map((k) => ({
          id: k.id,
          platform_id: provider.id,
          value: "",
        })),
      }));

      // 执行变更
      const { addedCount, removedCount } = await applyMergedModelChanges(
        provider.id,
        addedFormModels,
        removedFormModels
      );

      // 更新结果
      const result = results.find((r) => r.provider.id === provider.id);
      if (result) {
        result.addedCount = addedCount;
        result.removedCount = removedCount;
      }
    }
  };

  /**
   * 应用合并后的模型变更（包括密钥关联）
   */
  const applyMergedModelChanges = async (
    providerId: number,
    selectedModels: FormModel[],
    removedModels: FormModel[]
  ): Promise<{ addedCount: number; removedCount: number; updatedCount: number }> => {
    let addedCount = 0;
    let removedCount = 0;
    let updatedCount = 0;

    // 1. 删除被移除的模型
    const modelIdsToDelete = removedModels.filter((model) => model.id > 0).map((model) => model.id);

    if (modelIdsToDelete.length > 0) {
      try {
        if (modelIdsToDelete.length === 1) {
          // 单个模型删除
          await providerApi.deleteModel(providerId, modelIdsToDelete[0]);
          removedCount++;
        } else {
          // 批量删除
          const result = await providerApi.deleteModelsBatch(providerId, modelIdsToDelete);
          removedCount = result.deleted_count;
        }
      } catch (error) {
        console.warn(`删除模型失败:`, error);
      }
    }

    // 2. 处理新增和更新的模型
    for (const model of selectedModels) {
      const apiKeyIds = model.api_keys?.map((k) => ({ id: k.id })) || [];

      if (model.id === -1) {
        // 新增模型
        try {
          await providerApi.createModel(providerId, {
            name: model.name,
            alias: model.alias,
            api_keys: apiKeyIds,
          });
          addedCount++;
        } catch (error) {
          console.warn(`创建模型 ${model.name} 失败:`, error);
        }
      } else if (model.id > 0) {
        // 更新现有模型的密钥关联
        try {
          await providerApi.updateModel(providerId, model.id, {
            name: model.name,
            alias: model.alias,
            api_keys: model.api_keys,
          });
          updatedCount++;
        } catch (error) {
          console.warn(`更新模型 ${model.name} 失败:`, error);
        }
      }
    }

    // 3. 刷新模型列表
    await store.loadModelsByProviderId(providerId);

    return { addedCount, removedCount, updatedCount };
  };

  // 批量更新中的 diff 确认
  const handleBatchDiffConfirm = async (
    selectedModels: FormModel[],
    removedModels: FormModel[]
  ) => {
    if (batchDiffResolve.value) {
      batchDiffResolve.value({ confirmed: true, selectedModels, removedModels });
      batchDiffResolve.value = null;
    }
    showBatchDiffModal.value = false;
    currentBatchDiffProvider.value = null;
  };

  // 批量更新中的 diff 取消
  const handleBatchDiffCancel = () => {
    if (batchDiffResolve.value) {
      batchDiffResolve.value({ confirmed: false });
      batchDiffResolve.value = null;
    }
    showBatchDiffModal.value = false;
    currentBatchDiffProvider.value = null;
  };

  return {
    handleBatchDiffConfirm,
    handleBatchDiffCancel,
    processSingleProviderUpdate,
  };
}
