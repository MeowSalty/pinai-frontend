<script setup lang="ts">
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useMessage, useDialog } from "naive-ui";
import { useSupplierStore } from "@/stores/providerStore";
import { useApiServerStore } from "@/stores/apiServerStore";
import type { Platform } from "@/types/provider";
import type { ApiError } from "@/types/api";
import SupplierTable from "@/components/supplier/SupplierTable.vue";
import SupplierForm from "@/components/supplier/SupplierForm.vue";
import ModelRenameManager from "@/components/supplier/ModelRenameManager.vue";
import ModelDiffViewer from "@/components/supplier/ModelDiffViewer.vue";
import BatchImportSuppliers from "@/components/supplier/BatchImportSuppliers.vue";
import { handleApiError } from "@/utils/errorHandler";

// 定义一个用于前端显示的模型类型，对应 currentSupplier.models 的类型
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

const store = useSupplierStore();
const {
  suppliers,
  isLoading,
  currentSupplier,
  isFetchingModels,
  isApiKeyDirty,
  editingSupplierId,
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
const newFetchedModels = ref<FormModel[]>([]);

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
    await store.fetchSuppliers();
  } catch (error) {
    message.error(handleApiError(error, "加载供应商数据"));
  }
});

const handleAdd = () => {
  store.initNewSupplier();
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
    await store.loadSupplierForEdit(row.id);

    // 2. 加载供应商密钥信息
    try {
      await store.loadSupplierApiKey(row.id);
    } catch (error) {
      console.warn("加载供应商密钥失败，将使用空密钥：", error);
      // 密钥加载失败不应阻止编辑功能，继续执行
    }

    // 3. 获取该供应商已保存的模型列表
    await store.fetchModelsByPlatformId(row.id);

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
        await store.deleteSupplier(id);
        message.success("供应商已删除");
      } catch (error) {
        message.error(handleApiError(error, "删除供应商"));
      }
    },
  });
};

const handleSubmit = async () => {
  if (!currentSupplier.value) return;

  // 检查是否选择了服务器
  if (!activeServer.value) {
    message.warning("请先选择一个 API 服务器");
    return;
  }

  try {
    if (formMode.value === "add") {
      // 创建时，需要移除 model 中的 id
      const createPayload = JSON.parse(JSON.stringify(currentSupplier.value));
      createPayload.models = createPayload.models.map((m: { id: number }) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = m;
        return rest;
      });
      await store.createSupplier(createPayload);
    } else {
      // 更新时，直接使用 currentSupplier
      await store.updateSupplier(currentSupplier.value);
    }
    message.success(formMode.value === "add" ? "添加成功" : "修改成功");
    showModal.value = false;
  } catch (error) {
    message.error(handleApiError(error, formMode.value === "add" ? "添加" : "更新" + "供应商"));
  }
};

const removeModel = (index: number) => {
  if (currentSupplier.value) {
    currentSupplier.value.models.splice(index, 1);
  }
};

const addModelRow = () => {
  if (currentSupplier.value) {
    currentSupplier.value.models.push({
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

  if (!currentSupplier.value) {
    message.error("获取模型失败：当前供应商信息为空");
    return;
  }

  try {
    // 获取模型数据而不是直接更新
    const fetchedModels = await store.fetchModelsFromProviderOnly();

    // 检查是否需要显示差异对比
    if (
      currentSupplier.value.models.length > 0 &&
      currentSupplier.value.models.some((m) => m.id > 0)
    ) {
      // 如果已有模型且至少有一个是已保存的模型（id > 0），则显示差异对比
      newFetchedModels.value = fetchedModels as FormModel[];
      showDiffModal.value = true;
    } else {
      // 如果模型列表为空或都是新增的模型，则直接替换
      currentSupplier.value.models = fetchedModels;
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

  if (!currentSupplier.value || !editingSupplierId.value) {
    message.error("无法执行模型变更：当前供应商信息为空");
    showDiffModal.value = false;
    return;
  }

  try {
    // 执行实际的模型变更操作并获取计数
    const { addedCount, removedCount } = await store.applyModelChanges(
      editingSupplierId.value,
      selectedModels,
      removedModels
    );

    // 刷新当前供应商的模型列表
    await store.fetchModelsByPlatformId(editingSupplierId.value);
    message.success(`模型变更成功，新增了 ${addedCount} 个模型，删除了 ${removedCount} 个模型`);
  } catch (error) {
    message.error(handleApiError(error, "获取模型"));
  } finally {
    showDiffModal.value = false;
  }
};

const handleBatchImportSuccess = () => {
  showBatchImportModal.value = false;
  store.fetchSuppliers();
};

// 取消模型差异更新
const handleModelDiffCancel = () => {
  showDiffModal.value = false;
};
</script>

<template>
  <SupplierTable
    :suppliers="suppliers as Platform[]"
    :is-loading="isLoading"
    @add="handleAdd"
    @edit="handleEdit"
    @delete="handleDelete"
    @batch-import="showBatchImportModal = true"
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
      v-if="currentSupplier"
      :models="(currentSupplier.models as unknown) as FormModel[]"
      @update:models="currentSupplier.models = $event"
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
      v-if="currentSupplier"
      :existing-models="(currentSupplier.models as unknown) as FormModel[]"
      :new-models="newFetchedModels"
      @confirm="handleModelDiffConfirm"
      @cancel="handleModelDiffCancel"
    />
  </n-modal>

  <!-- 供应商表单模态框 -->
  <SupplierForm
    v-if="showModal"
    :supplier="currentSupplier"
    :form-mode="formMode"
    :is-loading="isLoading"
    :is-fetching-models="isFetchingModels"
    :is-api-key-dirty="isApiKeyDirty"
    :api-format-options="apiFormatOptions"
    @submit="handleSubmit"
    @cancel="showModal = false"
    @update:supplier="(value) => (currentSupplier = value)"
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
    <BatchImportSuppliers
      @close="showBatchImportModal = false"
      @import-success="handleBatchImportSuccess"
    />
  </n-modal>
</template>
