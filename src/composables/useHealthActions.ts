import { onMounted } from "vue";
import { handleApiError } from "@/utils/errorHandler";
import { healthApi } from "@/services/healthApi";
import { useApiServerCheck } from "@/composables/useApiServerCheck";
import { useHealthState } from "@/composables/useHealthState";
import { useMessage } from "naive-ui";
import type { HealthIssueItem } from "@/types/health";

let actionsInstance: ReturnType<typeof createHealthActions> | null = null;

function createHealthActions() {
  const message = useMessage();
  const { checkApiServer } = useApiServerCheck();

  const {
    healthData,
    loading,
    platformHealthList,
    platformListLoading,
    platformPagination,
    apiKeyHealthList,
    apiKeyListLoading,
    apiKeyPagination,
    modelHealthList,
    modelListLoading,
    modelPagination,
    issuesList,
    issuesLoading,
  } = useHealthState();

  const fetchHealthData = async () => {
    try {
      loading.value = true;
      healthData.value = await healthApi.getHealthSummary();
    } catch (error) {
      message.error(handleApiError(error, "获取健康状态数据"));
    } finally {
      loading.value = false;
    }
  };

  const fetchPlatformHealthList = async () => {
    try {
      platformListLoading.value = true;
      const response = await healthApi.getPlatformHealthList({
        page: platformPagination.page,
        page_size: platformPagination.pageSize,
      });
      platformHealthList.value = response.items;
      platformPagination.itemCount = response.total;
    } catch (error) {
      message.error(handleApiError(error, "获取平台健康状态列表"));
    } finally {
      platformListLoading.value = false;
    }
  };

  const fetchApiKeyHealthList = async () => {
    try {
      apiKeyListLoading.value = true;
      const response = await healthApi.getApiKeyHealthList({
        page: apiKeyPagination.page,
        page_size: apiKeyPagination.pageSize,
      });
      apiKeyHealthList.value = response.items;
      apiKeyPagination.itemCount = response.total;
    } catch (error) {
      message.error(handleApiError(error, "获取密钥健康状态列表"));
    } finally {
      apiKeyListLoading.value = false;
    }
  };

  const fetchModelHealthList = async () => {
    try {
      modelListLoading.value = true;
      const response = await healthApi.getModelHealthList({
        page: modelPagination.page,
        page_size: modelPagination.pageSize,
      });
      modelHealthList.value = response.items;
      modelPagination.itemCount = response.total;
    } catch (error) {
      message.error(handleApiError(error, "获取模型健康状态列表"));
    } finally {
      modelListLoading.value = false;
    }
  };

  const fetchHealthIssues = async () => {
    try {
      issuesLoading.value = true;
      const response = await healthApi.getHealthIssues();
      issuesList.value = response.items;
    } catch (error) {
      message.error(handleApiError(error, "获取活跃问题列表"));
    } finally {
      issuesLoading.value = false;
    }
  };

  const handleRecoverIssue = async (item: HealthIssueItem) => {
    try {
      if (item.resource_type === 1) {
        await healthApi.enablePlatform(item.resource_id);
      } else if (item.resource_type === 2) {
        await healthApi.enableKey(item.resource_id);
      } else if (item.resource_type === 3) {
        await healthApi.enableModel(item.resource_id);
      }
      message.success("恢复成功");
      fetchHealthIssues();
      fetchHealthData();
    } catch (error) {
      message.error(handleApiError(error, "恢复失败"));
    }
  };

  const handleEnablePlatform = async (platformId: number) => {
    try {
      await healthApi.enablePlatform(platformId);
      message.success("操作成功");
      fetchPlatformHealthList();
    } catch (error) {
      message.error(handleApiError(error, "操作失败"));
    }
  };

  const handleEnableApiKey = async (keyId: number) => {
    try {
      await healthApi.enableKey(keyId);
      message.success("操作成功");
      fetchApiKeyHealthList();
    } catch (error) {
      message.error(handleApiError(error, "操作失败"));
    }
  };

  const handleEnableModel = async (modelId: number) => {
    try {
      await healthApi.enableModel(modelId);
      message.success("操作成功");
      fetchModelHealthList();
    } catch (error) {
      message.error(handleApiError(error, "操作失败"));
    }
  };

  const handlePlatformPageChange = (page: number) => {
    platformPagination.page = page;
    fetchPlatformHealthList();
  };

  const handlePlatformPageSizeChange = (pageSize: number) => {
    platformPagination.pageSize = pageSize;
    platformPagination.page = 1;
    fetchPlatformHealthList();
  };

  const handleApiKeyPageChange = (page: number) => {
    apiKeyPagination.page = page;
    fetchApiKeyHealthList();
  };

  const handleApiKeyPageSizeChange = (pageSize: number) => {
    apiKeyPagination.pageSize = pageSize;
    apiKeyPagination.page = 1;
    fetchApiKeyHealthList();
  };

  const handlePageChange = (page: number) => {
    modelPagination.page = page;
    fetchModelHealthList();
  };

  const handlePageSizeChange = (pageSize: number) => {
    modelPagination.pageSize = pageSize;
    modelPagination.page = 1;
    fetchModelHealthList();
  };

  const handleTabChange = (tabName: string) => {
    if (tabName === "platform" && platformHealthList.value.length === 0) {
      fetchPlatformHealthList();
    }
    if (tabName === "apikey" && apiKeyHealthList.value.length === 0) {
      fetchApiKeyHealthList();
    }
    if (tabName === "model" && modelHealthList.value.length === 0) {
      fetchModelHealthList();
    }
  };

  onMounted(() => {
    if (!checkApiServer()) {
      return;
    }

    fetchHealthData();
    fetchHealthIssues();
  });

  return {
    fetchHealthData,
    fetchPlatformHealthList,
    fetchApiKeyHealthList,
    fetchModelHealthList,
    fetchHealthIssues,
    handleRecoverIssue,
    handleEnablePlatform,
    handleEnableApiKey,
    handleEnableModel,
    handlePlatformPageChange,
    handlePlatformPageSizeChange,
    handleApiKeyPageChange,
    handleApiKeyPageSizeChange,
    handlePageChange,
    handlePageSizeChange,
    handleTabChange,
  };
}

export function useHealthActions() {
  if (!actionsInstance) {
    actionsInstance = createHealthActions();
  }
  return actionsInstance;
}
