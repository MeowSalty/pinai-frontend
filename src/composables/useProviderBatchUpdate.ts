import type { Platform } from "@/types/provider";
import { handleApiError } from "@/utils/errorHandler";
import { useProviderState, type FormModel } from "./useProviderState";

/**
 * Provider 批量更新相关操作
 */
export function useProviderBatchUpdate() {
  const {
    store,
    activeServer,
    currentProvider,
    selectedProvidersForBatch,
    batchUpdateOptions,
    batchUpdateResults,
    showBatchUpdateModal,
    showBatchResultModal,
    showBatchDiffModal,
    currentBatchDiffProvider,
    newFetchedModels,
    batchDiffResolve,
  } = useProviderState();

  // 处理批量更新模型
  const handleBatchUpdateModels = (providers: Platform[]) => {
    selectedProvidersForBatch.value = providers;
    showBatchUpdateModal.value = true;
  };

  // 确认批量更新
  const handleConfirmBatchUpdate = async (options: {
    autoRename: boolean;
    autoConfirm: boolean;
  }) => {
    batchUpdateOptions.value = options;
    showBatchUpdateModal.value = false;

    // 初始化结果列表
    batchUpdateResults.value = selectedProvidersForBatch.value.map((provider) => ({
      provider,
      status: "pending" as const,
    }));
    showBatchResultModal.value = true;

    // 逐个处理供应商
    for (const result of batchUpdateResults.value) {
      try {
        await processSingleProviderUpdate(result.provider, options);
        result.status = "success";
      } catch (error) {
        result.status = "error";
        result.error = handleApiError(error, `更新 ${result.provider.name} 的模型`);
      }
    }
  };

  // 处理单个供应商的模型更新
  const processSingleProviderUpdate = async (
    provider: Platform,
    options: { autoRename: boolean; autoConfirm: boolean }
  ) => {
    // 检查是否选择了服务器
    if (!activeServer.value) {
      throw new Error("请先选择一个 API 服务器");
    }

    // 1. 加载供应商信息
    await store.loadProviderForEdit(provider.id);

    // 2. 加载 API 密钥
    try {
      await store.loadProviderApiKey(provider.id);
    } catch (error) {
      console.warn("加载供应商密钥失败：", error);
    }

    // 3. 获取现有模型列表
    await store.fetchModelsByProviderId(provider.id);

    // 4. 从供应商 API 获取最新模型列表
    const fetchedModels = await store.fetchModelsFromProviderOnly();

    // 5. 如果启用自动重命名，应用重命名规则
    let modelsToProcess = fetchedModels as FormModel[];
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

    // 6. 判断是否需要显示 diff 界面
    const hasExistingModels =
      currentProvider.value &&
      currentProvider.value.models.length > 0 &&
      currentProvider.value.models.some((m) => m.id > 0);

    if (!options.autoConfirm && hasExistingModels) {
      // 检查是否有实际变更
      const existingModelNames = new Set(currentProvider.value!.models.map((m) => m.name));
      const newModelNames = new Set(modelsToProcess.map((m) => m.name));

      const removedModels = currentProvider.value!.models.filter((m) => !newModelNames.has(m.name));
      const addedModels = modelsToProcess.filter((m) => !existingModelNames.has(m.name));

      const hasChanges = removedModels.length > 0 || addedModels.length > 0;

      if (hasChanges) {
        // 有变更，弹出 diff 界面
        currentBatchDiffProvider.value = provider;
        newFetchedModels.value = modelsToProcess;
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
          const finalAddedModels = result.selectedModels
            .filter((m) => m.id === -1)
            .map((m) => ({
              ...m,
              platform_id: provider.id,
            }));

          const finalRemovedModels = result.removedModels.map((m) => ({
            ...m,
            platform_id: provider.id,
          }));

          const { addedCount, removedCount } = await store.applyModelChanges(
            provider.id,
            finalAddedModels,
            finalRemovedModels
          );

          const result_item = batchUpdateResults.value.find((r) => r.provider.id === provider.id);
          if (result_item) {
            result_item.addedCount = addedCount;
            result_item.removedCount = removedCount;
          }

          return; // 已处理完成，直接返回
        }
      } else {
        // 无变更，直接标记为成功
        const result_item = batchUpdateResults.value.find((r) => r.provider.id === provider.id);
        if (result_item) {
          result_item.addedCount = 0;
          result_item.removedCount = 0;
        }
        return; // 无变更，直接返回
      }
    }

    // 7. 自动应用变更
    if (currentProvider.value) {
      const existingModels = currentProvider.value.models;
      const newModelNames = new Set(modelsToProcess.map((m) => m.name));
      const existingModelNames = new Set(existingModels.map((m) => m.name));

      // 找出需要删除的模型
      const removedModels = existingModels.filter((m) => !newModelNames.has(m.name));

      // 找出需要添加的模型
      const addedModels = modelsToProcess.filter((m) => !existingModelNames.has(m.name));

      // 为模型添加 platform_id
      const finalAddedModels = addedModels.map((m) => ({
        ...m,
        platform_id: provider.id,
      }));

      const finalRemovedModels = removedModels.map((m) => ({
        ...m,
        platform_id: provider.id,
      }));

      // 执行变更
      const { addedCount, removedCount } = await store.applyModelChanges(
        provider.id,
        finalAddedModels,
        finalRemovedModels
      );

      // 更新结果
      const result = batchUpdateResults.value.find((r) => r.provider.id === provider.id);
      if (result) {
        result.addedCount = addedCount;
        result.removedCount = removedCount;
      }
    }
  };

  // 取消批量更新
  const handleCancelBatchUpdate = () => {
    showBatchUpdateModal.value = false;
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

  // 重试失败项
  const handleRetryFailedItems = async () => {
    // 获取所有失败的项
    const failedResults = batchUpdateResults.value.filter((r) => r.status === "error");

    if (failedResults.length === 0) {
      return;
    }

    // 将失败项状态重置为 pending
    failedResults.forEach((result) => {
      result.status = "pending";
      result.error = undefined;
    });

    // 逐个重试失败的供应商
    for (const result of failedResults) {
      try {
        await processSingleProviderUpdate(result.provider, batchUpdateOptions.value);
        result.status = "success";
      } catch (error) {
        result.status = "error";
        result.error = handleApiError(error, `更新 ${result.provider.name} 的模型`);
      }
    }
  };

  // 关闭批量更新结果弹窗
  const handleCloseBatchResult = () => {
    showBatchResultModal.value = false;
    batchUpdateResults.value = [];
    selectedProvidersForBatch.value = [];
    // 刷新供应商列表
    store.fetchProviders();
  };

  return {
    handleBatchUpdateModels,
    handleConfirmBatchUpdate,
    handleCancelBatchUpdate,
    handleBatchDiffConfirm,
    handleBatchDiffCancel,
    handleRetryFailedItems,
    handleCloseBatchResult,
  };
}
