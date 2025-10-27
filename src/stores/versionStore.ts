import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { checkForUpdates } from "@/services/versionCheck";

export const useVersionStore = defineStore("version", () => {
  // 状态
  const hasUpdate = ref(false);
  const latestVersion = ref("");
  const isChecking = ref(false);
  const lastCheckTime = ref<number | null>(null);

  // 计算属性
  const shouldShowUpdateBadge = computed(() => hasUpdate.value);

  // 操作
  const checkVersion = async () => {
    if (isChecking.value) return;

    isChecking.value = true;
    try {
      const currentVersion = __APP_VERSION__ !== "0.0.0" ? __APP_VERSION__ : "latest";

      const updateInfo = await checkForUpdates(currentVersion);

      hasUpdate.value = updateInfo.hasUpdate;
      latestVersion.value = updateInfo.latestVersion || currentVersion;
      lastCheckTime.value = Date.now();
    } catch (error) {
      console.error("版本检查失败：", error);
    } finally {
      isChecking.value = false;
    }
  };

  const dismissUpdate = () => {
    hasUpdate.value = false;
  };

  // 初始化时检查一次
  const initialize = async () => {
    await checkVersion();
  };

  return {
    // 状态
    hasUpdate: readonly(hasUpdate),
    latestVersion: readonly(latestVersion),
    isChecking: readonly(isChecking),
    lastCheckTime: readonly(lastCheckTime),

    // 计算属性
    shouldShowUpdateBadge,

    // 操作
    checkVersion,
    dismissUpdate,
    initialize,
  };
});
