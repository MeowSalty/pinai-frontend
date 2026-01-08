import { defineStore } from "pinia";
import { ref } from "vue";
import type { Platform } from "@/types/provider";

export interface BatchUpdateResult {
  provider: Platform;
  status: "pending" | "success" | "error";
  error?: string;
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
