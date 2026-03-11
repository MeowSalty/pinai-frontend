<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import type { DataTableRowKey } from "naive-ui";
import { useProviderState, type FormModel } from "@/composables/useProviderState";
import { useProviderActions } from "@/composables/useProviderActions";
import { useProviderModels } from "@/composables/useProviderModels";
import { useBatchUpdateStore } from "@/stores/batchUpdateStore";

const router = useRouter();
const batchUpdateStore = useBatchUpdateStore();

// 状态管理（需要在任何 computed/watch 使用 providers 之前初始化）
const {
  providers,
  isLoading,
  currentProvider,
  showRenameModal,
  showDiffModal,
  newFetchedModels,
  currentFilteredKeyId,
} = useProviderState();

// 搜索
const searchKeyword = ref<string>("");
const normalizedKeyword = computed(() => searchKeyword.value.trim().toLowerCase());

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

const filteredProviders = computed(() => {
  const keyword = normalizedKeyword.value;
  if (!keyword) return providers.value;

  return providers.value.filter((provider) => {
    const name = (provider.name || "").toLowerCase();
    const baseUrl = (provider.base_url || "").toLowerCase();
    return name.includes(keyword) || baseUrl.includes(keyword);
  });
});

// 当列表筛选变化时，清理不在当前筛选结果中的选中项，避免批量操作选中“不可见”平台
watch(
  filteredProviders,
  (next) => {
    const idSet = new Set(next.map((p) => p.id));
    checkedRowKeys.value = checkedRowKeys.value.filter((key) => {
      const id = typeof key === "number" ? key : Number(key);
      return idSet.has(id);
    });
  },
  { flush: "sync" },
);

// 批量更新模型 - 导航到批量更新页面
const handleBatchUpdateModels = () => {
  if (selectedProviders.value.length === 0) {
    return;
  }
  batchUpdateStore.setSelectedProviders(selectedProviders.value);
  router.push("/provider/batch-update");
};

// 基础统计
const totalProviders = computed(() => providers.value.length);

// 计算用于差异对比的现有模型列表
const existingModelsForDiff = computed(() => {
  if (currentFilteredKeyId.value !== null && currentProvider.value) {
    // 只返回属于当前操作密钥的模型
    // 支持通过 tempId 或 id 筛选
    return currentProvider.value.models.filter((m) =>
      m.api_keys?.some((k) => {
        const keyIdentifier = k.tempId || String(k.id);
        return keyIdentifier === String(currentFilteredKeyId.value);
      }),
    ) as FormModel[];
  }
  // 返回所有模型
  return (currentProvider.value?.models || []) as FormModel[];
});

// 基础操作
const { handleDelete, handleEnableHealth, handleDisableHealth } = useProviderActions();

// 模型管理
const { handleModelDiffConfirm, handleModelDiffCancel } = useProviderModels();
</script>

<template>
  <n-flex vertical>
    <n-card :bordered="false">
      <div class="intro-card">
        <div class="intro-content">
          <h2 class="intro-title">平台管理</h2>
          <p class="intro-desc">
            管理平台、端点、模型、密钥与健康状态。共 {{ totalProviders }} 个平台，当前显示
            {{ filteredProviders.length }} 个。
          </p>
        </div>

        <div class="intro-actions">
          <n-input
            v-model:value="searchKeyword"
            clearable
            placeholder="搜索平台名称或 URL"
            style="width: 280px"
          />
          <n-button type="primary" @click="router.push('/provider/add')">添加平台</n-button>
          <n-button
            type="primary"
            @click="handleBatchUpdateModels"
            :disabled="selectedProviders.length === 0"
          >
            批量更新模型 ({{ selectedProviders.length }})
          </n-button>
          <n-button @click="router.push('/provider/batch-import')">批量导入</n-button>
        </div>
      </div>
    </n-card>

    <ProviderTable
      :providers="filteredProviders"
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
      :models="currentProvider.models as unknown as FormModel[]"
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
</template>

<style scoped>
.intro-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

.intro-content {
  flex: 1;
}

.intro-title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 600;
}

.intro-desc {
  margin: 0;
  color: var(--n-text-color-3);
  font-size: 14px;
  line-height: 1.6;
}

.intro-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .intro-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .intro-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
