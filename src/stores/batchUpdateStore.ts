import { defineStore } from "pinia";
import { ref } from "vue";
import type { Platform } from "@/types/provider";

/**
 * 密钥级别的更新结果
 * 用于记录每个密钥的获取状态
 */
export interface KeyFetchResult {
  keyId: number;
  keyValue: string; // 脱敏后的密钥
  status: "pending" | "success" | "error";
  error?: string;
  modelCount?: number; // 获取到的模型数量
}

/**
 * 批量更新结果
 * 包含供应商信息和每个密钥的结果
 */
export interface BatchUpdateResult {
  provider: Platform;
  status: "pending" | "success" | "error";
  error?: string;
  keyResults: KeyFetchResult[]; // 每个密钥的结果
  addedCount?: number;
  removedCount?: number;
}

export const useBatchUpdateStore = defineStore("batchUpdate", () => {
  // 选中的供应商列表
  const selectedProviders = ref<Platform[]>([]);

  // 批量更新选项
  const options = ref({
    autoRename: false,
    autoConfirm: false,
  });

  // 更新结果
  const results = ref<BatchUpdateResult[]>([]);

  // 当前步骤：confirm | progress | result
  const currentStep = ref<"confirm" | "progress" | "result">("confirm");

  // 设置选中的供应商
  const setSelectedProviders = (providers: Platform[]) => {
    selectedProviders.value = providers;
    currentStep.value = "confirm";
  };

  // 重置状态
  const reset = () => {
    selectedProviders.value = [];
    options.value = { autoRename: false, autoConfirm: false };
    results.value = [];
    currentStep.value = "confirm";
  };

  return {
    selectedProviders,
    options,
    results,
    currentStep,
    setSelectedProviders,
    reset,
  };
});
