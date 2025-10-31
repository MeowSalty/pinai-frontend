import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useMessage, useDialog } from "naive-ui";
import { useProviderStore } from "@/stores/providerStore";
import { useApiServerStore } from "@/stores/apiServerStore";
import type { Platform } from "@/types/provider";

// 定义一个用于前端显示的模型类型，对应 currentProvider.models 的类型
export interface FormModel {
  id: number;
  platform_id: number;
  name: string;
  alias: string;
  isDirty?: boolean;
}

// 单例状态存储
let stateInstance: ReturnType<typeof createProviderState> | null = null;

/**
 * 创建 Provider 页面状态
 */
function createProviderState() {
  // Stores
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

  // UI 工具
  const message = useMessage();
  const dialog = useDialog();

  // 模态框显示状态
  const showModal = ref(false);
  const formMode = ref<"add" | "edit">("add");
  const showRenameModal = ref(false);
  const showDiffModal = ref(false);
  const showBatchImportModal = ref(false);
  const showBatchUpdateModal = ref(false);
  const showBatchResultModal = ref(false);
  const showBatchDiffModal = ref(false);

  // 模型相关状态
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

  // 常量
  const apiFormatOptions = [
    { label: "OpenAI", value: "OpenAI" },
    { label: "Gemini", value: "Gemini" },
  ];

  return {
    // Stores
    store,
    providers,
    isLoading,
    currentProvider,
    isFetchingModels,
    isApiKeyDirty,
    editingProviderId,
    apiServerStore,
    activeServer,

    // UI 工具
    message,
    dialog,

    // 模态框状态
    showModal,
    formMode,
    showRenameModal,
    showDiffModal,
    showBatchImportModal,
    showBatchUpdateModal,
    showBatchResultModal,
    showBatchDiffModal,

    // 模型相关状态
    newFetchedModels,
    currentBatchDiffProvider,
    batchDiffResolve,

    // 批量更新状态
    selectedProvidersForBatch,
    batchUpdateOptions,
    batchUpdateResults,

    // 常量
    apiFormatOptions,
  };
}

/**
 * Provider 页面状态管理（单例模式）
 */
export function useProviderState() {
  if (!stateInstance) {
    stateInstance = createProviderState();
  }
  return stateInstance;
}
