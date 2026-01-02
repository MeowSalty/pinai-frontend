import { onMounted } from "vue";
import type { Platform, ProviderCreateRequest } from "@/types/provider";
import { handleApiError } from "@/utils/errorHandler";
import { useProviderState } from "./useProviderState";
import { providerApi } from "@/services/providerApi";
import { useApiServerCheck } from "./useApiServerCheck";

/**
 * 分步创建供应商（平台、密钥、模型）
 * 采用"保留部分资源"策略：任何步骤失败都不回滚，返回详细的创建结果
 */
async function createProviderStepByStep(data: ProviderCreateRequest): Promise<{
  success: boolean;
  platformId: number | null;
  results: {
    platform: { success: boolean; error?: string };
    apiKeys: { total: number; success: number; failed: number; errors: string[] };
    models: { total: number; success: number; failed: number; errors: string[] };
  };
}> {
  const result = {
    success: false,
    platformId: null as number | null,
    results: {
      platform: { success: false, error: undefined as string | undefined },
      apiKeys: { total: data.apiKeys.length, success: 0, failed: 0, errors: [] as string[] },
      models: { total: data.models.length, success: 0, failed: 0, errors: [] as string[] },
    },
  };

  // 创建平台
  try {
    const platform = await providerApi.createPlatform({
      name: data.platform.name,
      format: data.platform.format,
      base_url: data.platform.base_url,
      rate_limit: data.platform.rate_limit,
      custom_headers: data.platform.custom_headers,
    });
    result.platformId = platform.id;
    result.results.platform.success = true;
  } catch (error) {
    result.results.platform.error = error instanceof Error ? error.message : "创建平台失败";
    throw error; // 平台创建失败则终止整个流程
  }

  // 创建密钥（逐个尝试，失败不中断）
  const createdKeyIds: number[] = [];
  for (let i = 0; i < data.apiKeys.length; i++) {
    try {
      const createdKey = await providerApi.createProviderKey(result.platformId!, {
        value: data.apiKeys[i].value,
      });
      createdKeyIds.push(createdKey.id);
      result.results.apiKeys.success++;
    } catch (error) {
      result.results.apiKeys.failed++;
      result.results.apiKeys.errors.push(
        `密钥 ${i + 1} 创建失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  // 批量创建模型（只有在有密钥的情况下才创建）
  if (data.models.length > 0 && createdKeyIds.length > 0) {
    try {
      const modelsWithKeys = data.models.map((model) => ({
        name: model.name,
        alias: model.alias,
        api_keys: createdKeyIds.map((id) => ({ id })),
      }));

      const batchResult = await providerApi.createModelsBatch(result.platformId!, modelsWithKeys);
      result.results.models.success = batchResult.created_count;
      result.results.models.failed = batchResult.total_count - batchResult.created_count;
    } catch (error) {
      result.results.models.failed = data.models.length;
      result.results.models.errors.push(
        `批量创建模型失败：${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  } else if (data.models.length > 0 && createdKeyIds.length === 0) {
    result.results.models.failed = data.models.length;
    result.results.models.errors.push("无可用密钥，跳过模型创建");
  }

  // 判断整体是否成功（平台创建成功即视为部分成功）
  result.success = result.results.platform.success;

  return result;
}

/**
 * Provider 页面基础操作
 */
export function useProviderActions() {
  const {
    store,
    message,
    dialog,
    showModal,
    formMode,
    currentProvider,
    showBatchImportModal,
    editingProviderId,
  } = useProviderState();

  const { checkApiServer } = useApiServerCheck();

  // 页面初始化
  onMounted(async () => {
    // 检查是否选择了服务器
    if (!checkApiServer()) {
      return;
    }

    try {
      await store.fetchProviders();
    } catch (error) {
      message.error(handleApiError(error, "加载供应商数据"));
    }
  });

  // 添加供应商
  const handleAdd = () => {
    store.initNewProvider();
    formMode.value = "add";
    showModal.value = true;
  };

  // 编辑供应商
  const handleEdit = async (row: Platform) => {
    try {
      // 1. 加载供应商基本信息
      await store.loadProviderForEdit(row.id);

      // 2. 加载供应商密钥信息
      try {
        await store.loadProviderApiKey(row.id);
      } catch (error) {
        console.warn("加载供应商密钥失败，将使用空密钥：", error);
        // 密钥加载失败不应阻止编辑功能，继续执行
      }

      // 3. 获取该供应商已保存的模型列表
      await store.fetchModelsByProviderId(row.id);

      formMode.value = "edit";
      showModal.value = true;
    } catch (error) {
      message.error(handleApiError(error, "编辑供应商数据"));
    }
  };

  // 删除供应商
  const handleDelete = (id: number) => {
    dialog.warning({
      title: "确认删除",
      content: "您确定要删除这个供应商吗？此操作不可撤销。",
      positiveText: "确定",
      negativeText: "取消",
      onPositiveClick: async () => {
        try {
          await store.deletePlatform(id);
          message.success("供应商已删除");
        } catch (error) {
          message.error(handleApiError(error, "删除供应商"));
        }
      },
    });
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!currentProvider.value) return;

    try {
      if (formMode.value === "add") {
        // 创建时，需要移除 model 中的 id
        const createPayload = JSON.parse(JSON.stringify(currentProvider.value));
        createPayload.models = createPayload.models.map((m: { id: number }) => {
          const { id: _id, ...rest } = m;
          return rest;
        });

        // 使用分步创建方法
        const result = await createProviderStepByStep(createPayload);

        // 刷新供应商列表
        await store.fetchProviders();

        // 根据创建结果显示不同的提示信息
        if (result.success) {
          const { apiKeys, models } = result.results;

          // 完全成功
          if (apiKeys.failed === 0 && models.failed === 0) {
            message.success("供应商创建成功");
          }
          // 部分成功
          else {
            const warnings: string[] = [];

            if (apiKeys.failed > 0) {
              warnings.push(`${apiKeys.failed}/${apiKeys.total} 个密钥创建失败`);
            }
            if (models.failed > 0) {
              warnings.push(`${models.failed}/${models.total} 个模型创建失败`);
            }

            message.warning(
              `平台创建成功，但存在以下问题：\n${warnings.join(
                "\n"
              )}\n\n您可以在编辑页面继续完善配置`,
              { duration: 8000 }
            );
          }

          showModal.value = false;
        } else {
          // 平台创建失败
          throw new Error(result.results.platform.error || "平台创建失败");
        }
      } else {
        // 更新时，直接使用 currentProvider
        await store.updateProvider(currentProvider.value);
        message.success("修改成功");
        showModal.value = false;
      }
    } catch (error) {
      message.error(handleApiError(error, formMode.value === "add" ? "添加供应商" : "更新供应商"));
    }
  };

  // 批量导入成功处理
  const handleBatchImportSuccess = () => {
    showBatchImportModal.value = false;
    store.fetchProviders();
  };

  // 删除密钥
  const handleRemoveApiKey = (index: number) => {
    if (!currentProvider.value) return;

    const apiKeys = currentProvider.value.apiKeys;
    const removedKey = apiKeys[index];
    const removedKeyId = removedKey.id;
    const removedKeyTempId = removedKey.tempId;

    // 只有未保存的密钥（只有 tempId，无 id）需要前端清理模型关系
    // 已保存的密钥由后端在删除时自动清理关系
    if (!removedKeyId && removedKeyTempId) {
      const modelsToRemove: number[] = [];

      currentProvider.value.models.forEach((model, modelIndex) => {
        if (model.api_keys && model.api_keys.length > 0) {
          // 移除与该临时密钥的关联
          const updatedApiKeys = model.api_keys.filter((key) => key.tempId !== removedKeyTempId);

          // 只有在密钥数量发生变化时才标记为已修改
          if (updatedApiKeys.length !== model.api_keys.length) {
            model.api_keys = updatedApiKeys;
            model.isDirty = true;

            // 如果模型没有任何密钥关联，标记为待删除
            if (updatedApiKeys.length === 0) {
              modelsToRemove.push(modelIndex);
            }
          }
        }
      });

      // 从后向前删除模型，避免索引错乱
      for (let i = modelsToRemove.length - 1; i >= 0; i--) {
        currentProvider.value.models.splice(modelsToRemove[i], 1);
      }

      if (modelsToRemove.length > 0) {
        message.info(`已删除 ${modelsToRemove.length} 个无关联密钥的模型`);
      }
    }

    // 已保存的密钥：弹出确认对话框，直接调用 API 删除
    if (removedKeyId) {
      const platformId = editingProviderId.value;
      if (!platformId) return;

      dialog.warning({
        title: "确认删除",
        content: "确定要删除此密钥吗？删除后，该密钥与模型的关联关系也将被清除。",
        positiveText: "确定删除",
        negativeText: "取消",
        onPositiveClick: async () => {
          try {
            await providerApi.deleteProviderKey(platformId, removedKeyId);
            message.success("密钥已删除");

            // 刷新供应商数据
            await store.loadProviderApiKey(platformId);
            await store.fetchModelsByProviderId(platformId);
          } catch (error) {
            message.error(handleApiError(error, "删除密钥"));
          }
        },
      });
      return;
    }

    // 只有未保存的密钥需要从数组中移除
    // 已保存的密钥会通过数据刷新来更新
    if (removedKeyTempId) {
      apiKeys.splice(index, 1);

      // 如果没有密钥了，标记为脏状态
      if (apiKeys.length === 0) {
        store.markApiKeyAsDirty();
      }
    }
  };

  // 启用平台
  const handleEnableHealth = async (id: number) => {
    try {
      await providerApi.enablePlatformHealth(id);
      message.success("平台已启用");
      await store.fetchProviders();
    } catch (error) {
      message.error(handleApiError(error, "启用平台"));
    }
  };

  // 禁用平台
  const handleDisableHealth = async (id: number) => {
    dialog.warning({
      title: "确认禁用",
      content: "确定要禁用此平台吗？",
      positiveText: "确定",
      negativeText: "取消",
      onPositiveClick: async () => {
        try {
          await providerApi.disablePlatformHealth(id);
          message.success("平台已禁用");
          await store.fetchProviders();
        } catch (error) {
          message.error(handleApiError(error, "禁用平台"));
        }
      },
    });
  };

  return {
    handleAdd,
    handleEdit,
    handleDelete,
    handleSubmit,
    handleBatchImportSuccess,
    handleRemoveApiKey,
    handleEnableHealth,
    handleDisableHealth,
  };
}
