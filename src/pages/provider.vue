<script setup lang="ts">
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useMessage, useDialog } from "naive-ui";
import { useProviderStore } from "@/stores/providerStore";
import { useApiServerStore } from "@/stores/apiServerStore";
import type { Platform, ProviderUpdateRequest } from "@/types/provider";
import type { ApiError } from "@/types/api";
import { handleApiError } from "@/utils/errorHandler";

// 定义一个用于前端显示的模型类型，对应 currentProvider.models 的类型
interface FormModel {
  id: number;
  platform_id: number;
  name: string;
  alias: string;
  isDirty?: boolean;
}

defineOptions({
  name: "ProviderPage",
});

const store = useProviderStore();
const {
  providers,
  isLoading,
  currentProvider,
  isFetchingModels,
  isApiKeyDirty,
  editingProviderId,
} = storeToRefs(store);
const apiServerStore = useApiServerStore();
const { activeServer } = storeToRefs(apiServerStore);
const message = useMessage();
const dialog = useDialog();

const showModal = ref(false);
const formMode = ref<"add" | "edit">("add");
const showRenameModal = ref(false);
const showDiffModal = ref(false);
const showBatchImportModal = ref(false);
const showBatchUpdateModal = ref(false);
const showBatchResultModal = ref(false);
const showBatchDiffModal = ref(false);
const newFetchedModels = ref<FormModel[]>([]);
const currentBatchDiffProvider = ref<Platform | null>(null);
const batchDiffResolve = ref<
  | ((value: {
      confirmed: boolean;
      selectedModels?: FormModel[];
      removedModels?: FormModel[];
    }) => void)
  | null
>(null);

// 批量更新相关状态
const selectedProvidersForBatch = ref<Platform[]>([]);
const batchUpdateOptions = ref<{ autoRename: boolean; autoConfirm: boolean }>({
  autoRename: false,
  autoConfirm: false,
});
const batchUpdateResults = ref<
  Array<{
    provider: Platform;
    status: "pending" | "success" | "error";
    error?: string;
    addedCount?: number;
    removedCount?: number;
  }>
>([]);

const apiFormatOptions = [
  { label: "OpenAI", value: "OpenAI" },
  { label: "Gemini", value: "Gemini" },
];

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

const handleAdd = () => {
  store.initNewProvider();
  formMode.value = "add";
  showModal.value = true;
};

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

const handleDelete = (id: number) => {
  dialog.warning({
    title: "确认删除",
    content: "您确定要删除这个供应商吗？此操作不可撤销。",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        await store.deleteProvider(id);
        message.success("供应商已删除");
      } catch (error) {
        message.error(handleApiError(error, "删除供应商"));
      }
    },
  });
};

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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = m;
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
const handleModelDiffConfirm = async (selectedModels: FormModel[], removedModels: FormModel[]) => {
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

const handleBatchImportSuccess = () => {
  showBatchImportModal.value = false;
  store.fetchProviders();
};

// 取消模型差异更新
const handleModelDiffCancel = () => {
  showDiffModal.value = false;
};

// 处理批量更新模型
const handleBatchUpdateModels = (providers: Platform[]) => {
  selectedProvidersForBatch.value = providers;
  showBatchUpdateModal.value = true;
};

// 确认批量更新
const handleConfirmBatchUpdate = async (options: { autoRename: boolean; autoConfirm: boolean }) => {
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
const handleBatchDiffConfirm = async (selectedModels: FormModel[], removedModels: FormModel[]) => {
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
</script>

<template>
  <ProviderTable
    :providers="providers as Platform[]"
    :is-loading="isLoading"
    @add="handleAdd"
    @edit="handleEdit"
    @delete="handleDelete"
    @batch-import="showBatchImportModal = true"
    @batch-update-models="handleBatchUpdateModels"
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
      :models="(currentProvider.models as unknown) as FormModel[]"
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
      :existing-models="(currentProvider.models as unknown) as FormModel[]"
      :new-models="newFetchedModels"
      @confirm="handleModelDiffConfirm"
      @cancel="handleModelDiffCancel"
    />
  </n-modal>

  <!-- 批量更新中的模型差异查看模态框 -->
  <n-modal
    v-model:show="showBatchDiffModal"
    preset="card"
    style="width: 800px; max-height: 80vh"
    :title="`模型变更确认 - ${currentBatchDiffProvider?.name}`"
    content-style="overflow: auto;"
    :mask-closable="false"
    :closable="true"
    @update:show="(show: boolean) => !show && handleBatchDiffCancel()"
  >
    <ModelDiffViewer
      v-if="currentProvider && currentBatchDiffProvider"
      :existing-models="(currentProvider.models as unknown) as FormModel[]"
      :new-models="newFetchedModels"
      @confirm="handleBatchDiffConfirm"
      @cancel="handleBatchDiffCancel"
    />
  </n-modal>

  <!-- 供应商表单模态框 -->
  <ProviderForm
    v-if="showModal"
    :provider="currentProvider"
    :form-mode="formMode"
    :is-loading="isLoading"
    :is-fetching-models="isFetchingModels"
    :is-api-key-dirty="isApiKeyDirty"
    :api-format-options="apiFormatOptions"
    @submit="handleSubmit"
    @cancel="showModal = false"
    @update:provider="(value: ProviderUpdateRequest) => (currentProvider = value)"
    @mark-api-key-dirty="store.markApiKeyAsDirty"
    @add-model="addModelRow"
    @remove-model="removeModel"
    @fetch-models="handleFetchModels"
    @open-rename-modal="showRenameModal = true"
  />

  <!-- 批量导入模态框 -->
  <n-modal
    v-model:show="showBatchImportModal"
    preset="card"
    style="width: 800px"
    title="批量导入供应商"
  >
    <BatchImportProviders
      @close="showBatchImportModal = false"
      @import-success="handleBatchImportSuccess"
    />
  </n-modal>

  <!-- 批量更新模型确认弹窗 -->
  <n-modal
    v-model:show="showBatchUpdateModal"
    preset="card"
    style="width: 600px; max-height: 80vh"
    title="批量更新模型"
  >
    <BatchUpdateModelsModal
      :selected-providers="selectedProvidersForBatch"
      @confirm="handleConfirmBatchUpdate"
      @cancel="handleCancelBatchUpdate"
    />
  </n-modal>

  <!-- 批量更新结果弹窗 -->
  <n-modal
    v-model:show="showBatchResultModal"
    preset="card"
    style="width: 700px; max-height: 70vh"
    title="批量更新结果"
    :mask-closable="false"
    :closable="false"
  >
    <div>
      <n-scrollbar style="max-height: 300px">
        <n-list bordered>
          <n-list-item v-for="result in batchUpdateResults" :key="result.provider.id">
            <div style="display: flex; align-items: center; justify-content: space-between">
              <div style="flex: 1">
                <div style="font-weight: 500; margin-bottom: 4px">
                  {{ result.provider.name }}
                </div>
                <div v-if="result.status === 'success'" style="font-size: 12px; color: #18a058">
                  成功 - 新增 {{ result.addedCount ?? 0 }} 个，删除
                  {{ result.removedCount ?? 0 }} 个
                </div>
                <div v-else-if="result.status === 'error'" style="font-size: 12px; color: #d03050">
                  错误：{{ result.error }}
                </div>
                <div v-else style="font-size: 12px; color: #999">处理中...</div>
              </div>
              <div>
                <n-tag v-if="result.status === 'success'" type="success">成功</n-tag>
                <n-tag v-else-if="result.status === 'error'" type="error">失败</n-tag>
                <n-spin v-else size="small" />
              </div>
            </div>
          </n-list-item>
        </n-list>
      </n-scrollbar>

      <div style="display: flex; justify-content: space-between; margin-top: 24px">
        <n-button
          v-if="
            batchUpdateResults.some((r) => r.status === 'error') &&
            !batchUpdateResults.some((r) => r.status === 'pending')
          "
          type="warning"
          @click="handleRetryFailedItems"
        >
          重试失败项 ({{ batchUpdateResults.filter((r) => r.status === "error").length }})
        </n-button>
        <div v-else></div>
        <n-button
          type="primary"
          @click="handleCloseBatchResult"
          :disabled="batchUpdateResults.some((r) => r.status === 'pending')"
        >
          完成
        </n-button>
      </div>
    </div>
  </n-modal>
</template>
