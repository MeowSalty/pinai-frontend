import { onMounted } from "vue";
import type { Platform } from "@/types/provider";
import { handleApiError } from "@/utils/errorHandler";
import { useProviderState } from "./useProviderState";

/**
 * Provider 页面基础操作
 */
export function useProviderActions() {
  const {
    store,
    activeServer,
    message,
    dialog,
    showModal,
    formMode,
    currentProvider,
    showBatchImportModal,
  } = useProviderState();

  // 页面初始化
  onMounted(async () => {
    // 检查是否选择了服务器
    if (!activeServer.value) {
      message.warning("请先选择一个 API 服务器");
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
    // 检查是否选择了服务器
    if (!activeServer.value) {
      message.warning("请先选择一个 API 服务器");
      return;
    }

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

    // 检查是否选择了服务器
    if (!activeServer.value) {
      message.warning("请先选择一个 API 服务器");
      return;
    }

    try {
      if (formMode.value === "add") {
        // 创建时，需要移除 model 中的 id
        const createPayload = JSON.parse(JSON.stringify(currentProvider.value));
        createPayload.models = createPayload.models.map((m: { id: number }) => {
          const { id: _id, ...rest } = m;
          return rest;
        });
        await store.createProvider(createPayload);
      } else {
        // 更新时，直接使用 currentProvider
        await store.updateProvider(currentProvider.value);
      }
      message.success(formMode.value === "add" ? "添加成功" : "修改成功");
      showModal.value = false;
    } catch (error) {
      message.error(handleApiError(error, formMode.value === "add" ? "添加" : "更新" + "供应商"));
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

    if (removedKey.id) {
      // 如果密钥有 ID，将其添加到删除列表
      if (!currentProvider.value.deletedApiKeyIds) {
        currentProvider.value.deletedApiKeyIds = [];
      }
      currentProvider.value.deletedApiKeyIds.push(removedKey.id);
    }

    // 从数组中移除密钥
    apiKeys.splice(index, 1);

    // 如果没有密钥了，标记为脏状态
    if (apiKeys.length === 0) {
      store.markApiKeyAsDirty();
    }
  };

  return {
    handleAdd,
    handleEdit,
    handleDelete,
    handleSubmit,
    handleBatchImportSuccess,
    handleRemoveApiKey,
  };
}
