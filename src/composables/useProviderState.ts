import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useMessage, useDialog } from "naive-ui";
import { useProviderStore } from "@/stores/providerStore";
import { useApiServerStore } from "@/stores/apiServerStore";
import type { Platform, ApiKey } from "@/types/provider";

// 定义一个用于前端显示的模型类型，对应 currentProvider.models 的类型
export interface FormModel {
  id: number;
  platform_id: number;
  name: string;
  alias: string;
  isDirty?: boolean;
  api_keys?: ApiKey[]; // 模型关联的密钥列表
}

// 密钥获取结果
export interface KeyFetchResult {
  keyId: number;
  keyValue: string; // 用于显示（脱敏）
  models: FormModel[]; // 该密钥获取到的模型
  status: "success" | "error";
  error?: string;
}

// 合并后的模型（带密钥关联信息）
export interface MergedModel {
  name: string;
  alias: string;
  keyIds: number[]; // 关联的密钥 ID 列表
  isNew: boolean; // 是否为新模型
  id?: number; // 如果已存在则有 ID
  platform_id: number;
}

// 单例状态存储
let stateInstance: ReturnType<typeof createProviderState> | null = null;

/**
 * 创建 Provider 页面状态
 */
function createProviderState() {
  // Stores
  const store = useProviderStore();
  const { providers, isLoading, currentProvider, isApiKeyDirty, editingProviderId } =
    storeToRefs(store);

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
  const showBatchDiffModal = ref(false);

  // 模型相关状态
  const newFetchedModels = ref<FormModel[]>([]);
  const currentFilteredKeyId = ref<number | null>(null); // 当前差异对比针对的密钥 ID
  const currentBatchDiffProvider = ref<Platform | null>(null);
  const currentKeyFetchResults = ref<KeyFetchResult[]>([]); // 按密钥分组的获取结果
  const batchDiffResolve = ref<
    | ((value: {
        confirmed: boolean;
        selectedModels?: FormModel[];
        removedModels?: FormModel[];
      }) => void)
    | null
  >(null);

  // 常量
  const apiFormatOptions = [
    { label: "OpenAI", value: "OpenAI" },
    { label: "Gemini", value: "Gemini" },
    { label: "Anthropic", value: "Anthropic" },
  ];

  const variantOptionsMap: Record<string, Array<{ label: string; value: string }>> = {
    OpenAI: [
      { label: "Chat Completions", value: "chat_completions" },
      { label: "Responses", value: "responses" },
    ],
    Gemini: [{ label: "Generate", value: "generate" }],
    Anthropic: [{ label: "Messages", value: "messages" }],
  };

  const getVariantOptions = (provider: string) => {
    return variantOptionsMap[provider] || [];
  };

  return {
    // Stores
    store,
    providers,
    isLoading,
    currentProvider,
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
    showBatchDiffModal,

    // 模型相关状态
    newFetchedModels,
    currentFilteredKeyId,
    currentBatchDiffProvider,
    currentKeyFetchResults,
    batchDiffResolve,

    // 常量
    apiFormatOptions,
    getVariantOptions,
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
