<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import type { DataTableRowKey } from "naive-ui";
import { useProviderState, type FormModel } from "@/composables/useProviderState";
import { useProviderActions } from "@/composables/useProviderActions";
import { useProviderModels } from "@/composables/useProviderModels";
import { useBatchUpdateStore } from "@/stores/batchUpdateStore";

const router = useRouter();
const batchUpdateStore = useBatchUpdateStore();

// 多选相关状态
const checkedRowKeys = ref<DataTableRowKey[]>([]);

// 处理多选变化
const handleCheck = (rowKeys: DataTableRowKey[]) => {
  checkedRowKeys.value = rowKeys;
};

// 获取选中的供应商
const selectedProviders = computed(() => {
  return providers.value.filter((provider) => checkedRowKeys.value.includes(provider.id));
});

// 批量更新模型 - 导航到批量更新页面
const handleBatchUpdateModels = () => {
  if (selectedProviders.value.length === 0) {
    return;
  }
  batchUpdateStore.setSelectedProviders(selectedProviders.value);
  router.push("/provider/batch-update");
};

// 状态管理
const {
  providers,
  isLoading,
  currentProvider,
  showRenameModal,
  showDiffModal,
  showBatchImportModal,
  newFetchedModels,
  currentFilteredKeyId,
} = useProviderState();

// 计算用于差异对比的现有模型列表
const existingModelsForDiff = computed(() => {
  if (currentFilteredKeyId.value !== null && currentProvider.value) {
    // 只返回属于当前操作密钥的模型
    // 支持通过 tempId 或 id 筛选
    return currentProvider.value.models.filter((m) =>
      m.api_keys?.some((k) => {
        const keyIdentifier = k.tempId || String(k.id);
        return keyIdentifier === String(currentFilteredKeyId.value);
      })
    ) as FormModel[];
  }
  // 返回所有模型
  return (currentProvider.value?.models || []) as FormModel[];
});

// 基础操作
const { handleDelete, handleBatchImportSuccess, handleEnableHealth, handleDisableHealth } =
  useProviderActions();

// 模型管理
const { handleModelDiffConfirm, handleModelDiffCancel } = useProviderModels();
</script>

<template>
  <n-flex vertical>
    <n-flex justify="end">
      <n-button
        type="primary"
        @click="handleBatchUpdateModels"
        :disabled="selectedProviders.length === 0"
      >
        批量更新模型 ({{ selectedProviders.length }})
      </n-button>
      <n-button type="primary" @click="router.push('/provider/add')">添加供应商</n-button>
      <n-button @click="showBatchImportModal = true">批量导入</n-button>
    </n-flex>
    <ProviderTable
      :providers="providers"
      :is-loading="isLoading"
      :checked-row-keys="checkedRowKeys"
      @update:checked-row-keys="handleCheck"
      @delete="handleDelete"
      @enable-health="handleEnableHealth"
      @disable-health="handleDisableHealth"
    />
  </n-flex>

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
      :existing-models="existingModelsForDiff"
      :new-models="newFetchedModels"
      @confirm="handleModelDiffConfirm"
      @cancel="handleModelDiffCancel"
    />
  </n-modal>

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
</template>
