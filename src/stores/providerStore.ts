import { defineStore } from "pinia";
import { ref, readonly } from "vue";
import { supplierApi } from "@/services/providerApi";
import type { Provider, Model, ProviderCreateRequest, ProviderUpdateRequest } from "@/types/provider";
import type { ApiError } from "@/types/api";

/**
 * 供应商管理 Store
 * 使用 Pinia Setup Store 风格，用于管理供应商数据的状态和业务逻辑。
 */
export const useSupplierStore = defineStore("supplier", () => {
  // =================================================================
  // State - 状态
  // =================================================================

  /**
   * 从我方后端获取的供应商列表。
   */
  const suppliers = ref<Provider[]>([]);

  /**
   * 全局加载状态，用于表示正在与我方后端 API 通信。
   */
  const isLoading = ref(false);

  /**
   * 用于表示正在从外部供应商 API 获取模型列表的加载状态。
   */
  const isFetchingModels = ref(false);

  /**
   * 用于添加/编辑供应商表单的数据绑定。
   */
  const currentSupplier = ref<ProviderUpdateRequest | null>(null);

  /**
   * 存储当前正在编辑的供应商的 ID。
   */
  const editingSupplierId = ref<number | null>(null);

  /**
   * 标记密钥是否被修改过（脏状态）。
   */
  const isApiKeyDirty = ref(false);

  // =================================================================
  // Actions - 操作
  // =================================================================

  // --- 与我方后端的 CRUD 操作 ---

  /**
   * 异步获取所有供应商并更新 `suppliers` 状态。
   * @returns {Promise<void>}
   */
  async function fetchSuppliers(): Promise<void> {
    isLoading.value = true;
    try {
      const data = await supplierApi.getProviders();
      suppliers.value = data;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 向我方后端发送创建供应商的请求。
   * @param {ProviderCreateRequest} data - 创建供应商所需的数据。
   * @returns {Promise<boolean>} - 返回操作是否成功。
   */
  async function createSupplier(data: ProviderCreateRequest): Promise<void> {
    isLoading.value = true;
    try {
      await supplierApi.createProvider(data);
      await fetchSuppliers(); // 成功后刷新列表
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 向我方后端发送更新供应商的请求。
   * @param {ProviderUpdateRequest} data - 要更新的数据。
   * @returns {Promise<void>} - 返回操作是否成功。
   */
  async function updateSupplier(data: ProviderUpdateRequest): Promise<void> {
    if (editingSupplierId.value === null) {
      throw new Error("更新失败：未指定编辑供应商的 ID");
    }
    isLoading.value = true;
    try {
      // 1. 更新供应商平台信息
      await supplierApi.updateProvider(editingSupplierId.value, data.platform);

      // 2. 如果密钥被修改，单独更新密钥
      if (isApiKeyDirty.value && data.apiKey?.value) {
        if (data.apiKey.id) {
          // 更新现有密钥
          await supplierApi.updateProviderKey(
            editingSupplierId.value,
            data.apiKey.id,
            { value: data.apiKey.value }
          );
        } else {
          // 创建新密钥
          await supplierApi.createProviderKey(
            editingSupplierId.value,
            { value: data.apiKey.value }
          );
        }
      }

      // 3. 只更新脏模型
      if (data.models) {
        const dirtyModels = data.models.filter((m) => m.isDirty);
        for (const model of dirtyModels) {
          if (!model.id) {
            throw new Error("模型 ID 未定义");
          }
          await supplierApi.updateModel(editingSupplierId.value, model.id, {
            name: model.name,
            alias: model.alias,
          });
          model.isDirty = false; // 重置脏标记
        }
      }

      // 4. 重置密钥脏状态
      isApiKeyDirty.value = false;

      // 5. 成功后刷新列表
      await fetchSuppliers();
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 向我方后端发送删除供应商的请求。
   * @param {number} id - 要删除的供应商 ID。
   * @returns {Promise<boolean>} - 返回操作是否成功。
   */
  async function deleteSupplier(id: number): Promise<void> {
    isLoading.value = true;
    try {
      await supplierApi.deleteProvider(id);
      await fetchSuppliers(); // 成功后刷新列表
    } finally {
      isLoading.value = false;
    }
  }

  // --- 表单数据处理 ---

  /**
   * 初始化一个新的供应商对象用于表单。
   */
  function initNewSupplier(): void {
    editingSupplierId.value = null;
    isApiKeyDirty.value = false;
    currentSupplier.value = {
      platform: {
        name: "",
        format: "", // 默认值
        base_url: "",
        rate_limit: { rpm: 0, tpm: 0 },
      },
      models: [],
      apiKey: { value: "" },
    };
  }

  /**
   * 加载一个已有的供应商数据到表单中以供编辑。
   * @param {number} id - 要编辑的供应商 ID。
   */
  async function loadSupplierForEdit(id: number): Promise<void> {
    const supplier = suppliers.value.find((s: Provider) => s.id === id);
    if (supplier) {
      editingSupplierId.value = id;
      isApiKeyDirty.value = false;
      currentSupplier.value = {
        platform: {
          name: supplier.name,
          format: supplier.format,
          base_url: supplier.base_url,
          rate_limit: supplier.rate_limit,
        },
        // API 密钥初始为空，需要单独加载
        apiKey: { value: "" },
        models: [], // 初始化为空数组，后续由 fetchModelsByProviderId 填充
      };
    } else {
      throw new Error(`ID 为 ${id} 的供应商未找到`);
    }
  }

  /**
   * 加载供应商的 API 密钥
   * @param {number} id - 供应商 ID
   * @returns {Promise<void>}
   */
  async function loadSupplierApiKey(id: number): Promise<void> {
    try {
      const keys = await supplierApi.getProviderKeys(id);

      // 获取第一个密钥的值（假设每个供应商只有一个密钥）
      const apiKeyValue = keys.length > 0 ? keys[0].value : "";

      if (currentSupplier.value) {
        currentSupplier.value.apiKey.value = apiKeyValue;
        // 保存密钥ID以便后续更新
        currentSupplier.value.apiKey.id = keys.length > 0 ? keys[0].id : null;
      }

      console.log('加载供应商密钥成功：', {
        id,
        hasApiKey: !!apiKeyValue,
        apiKeyLength: apiKeyValue.length,
        keyCount: keys.length
      });
    } catch (error) {
      console.warn('获取供应商密钥失败：', error);
      // 密钥获取失败时，保持为空字符串，让用户可以输入新的
      if (currentSupplier.value) {
        currentSupplier.value.apiKey.value = "";
        currentSupplier.value.apiKey.id = null;
      }
      throw error; // 重新抛出错误，让调用者处理
    }
  }

  /**
   * 标记密钥为脏状态
   */
  function markApiKeyAsDirty(): void {
    isApiKeyDirty.value = true;
  }

  /**
   * 根据供应商 ID 从我方后端获取已保存的模型列表。
   * @param {number} providerId - 供应商 ID。
   * @returns {Promise<Model[]>} - 返回模型列表。
   */
  async function fetchModelsByProviderId(providerId: number): Promise<Model[]> {
    isFetchingModels.value = true;
    try {
      const models = await supplierApi.getModelsByProvider(providerId);
      if (currentSupplier.value) {
        currentSupplier.value.models = models.map((m) => ({
          ...m,
          id: m.id, // 保留原始 ID
          name: m.name,
          alias: m.alias,
          isDirty: false, // 初始化为非脏状态
        }));
      }
      return models;
    } finally {
      isFetchingModels.value = false;
    }
  }

  /**
   * 从外部供应商 API 获取可用模型列表，但不更新状态。
   * @returns {Promise<Model[]>}
   */
  async function fetchModelsFromProviderOnly(): Promise<Model[]> {
    if (!currentSupplier.value) {
      throw new Error("无法获取模型，currentSupplier 未初始化。");
    }

    const { platform, apiKey } = currentSupplier.value;

    isFetchingModels.value = true;
    try {
      let models: Omit<Model, "id" | "platform_id">[] = [];

      // 根据不同的供应商格式使用不同的请求方法
      switch (platform.format) {
        case "OpenAI":
          models = await fetchOpenAIModels(platform.base_url, apiKey.value);
          break;
        case "Ollama":
          models = await fetchOllamaModels(platform.base_url);
          break;
        case "Azure OpenAI":
          models = await fetchAzureOpenAIModels(platform.base_url, apiKey.value);
          break;
        default:
          throw new Error(`不支持的供应商格式：${platform.format}`);
      }

      // 返回处理后的模型列表而不是直接更新
      return models.map((m) => ({
        ...m,
        id: -1, // 新模型使用临时 ID
        platform_id: 0, // 临时 platform_id
        isDirty: true, // 新模型默认需要保存
      })) as Model[];
    } finally {
      isFetchingModels.value = false;
    }
  }

  /**
   * 从外部供应商 API 获取可用模型列表。
   * @returns {Promise<void>}
   */
  async function fetchModelsFromProvider(): Promise<void> {
    if (!currentSupplier.value) {
      throw new Error("无法获取模型，currentSupplier 未初始化。");
    }

    const { platform, apiKey } = currentSupplier.value;

    isFetchingModels.value = true;
    try {
      let models: Omit<Model, "id" | "platform_id">[] = [];

      // 根据不同的供应商格式使用不同的请求方法
      switch (platform.format) {
        case "OpenAI":
          models = await fetchOpenAIModels(platform.base_url, apiKey.value);
          break;
        case "Ollama":
          models = await fetchOllamaModels(platform.base_url);
          break;
        case "Azure OpenAI":
          models = await fetchAzureOpenAIModels(platform.base_url, apiKey.value);
          break;
        default:
          throw new Error(`不支持的供应商格式：${platform.format}`);
      }

      if (currentSupplier.value) {
        currentSupplier.value.models = models.map((m) => ({
          ...m,
          id: -1, // 新模型使用临时 ID
          isDirty: true, // 新模型默认需要保存
        }));
      }
    } finally {
      isFetchingModels.value = false;
    }
  }

  /**
   * 从 OpenAI 格式的 API 获取模型列表
   * @param baseUrl 基础 URL
   * @param apiKey API 密钥
   * @returns 模型列表
   */
  async function fetchOpenAIModels(
    baseUrl: string,
    apiKey: string
  ): Promise<Omit<Model, "platform_id">[]> {
    // 确保 baseUrl 末尾没有斜杠，然后拼接路径
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/v1/models`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const error: ApiError = new Error(
        `获取模型失败：${response.status} ${response.statusText}. 内容：${errorBody}`
      );
      error.status = response.status;
      error.statusText = response.statusText;
      error.body = errorBody;
      throw error;
    }

    const result = await response.json();

    // 为 OpenAI API 的模型响应定义一个接口
    interface OpenAIModel {
      id: string;
      [key: string]: unknown; // 允许其他未知属性
    }

    // 根据 OpenAI API 的常见格式 { data: [...] } 进行解析
    if (result.data && Array.isArray(result.data)) {
      return result.data.map((model: OpenAIModel) => ({
        id: -1, // 临时 ID，由后端分配实际 ID
        name: model.id,
        alias: "",
        isDirty: true, // 需要保存
      }));
    } else {
      const error: ApiError = new Error('无效的供应商 API 响应格式。期望得到 "data" 数组。');
      error.status = 400;
      error.statusText = "Invalid Response Format";
      error.body = JSON.stringify(result);
      throw error;
    }
  }

  /**
   * 从 Ollama API 获取模型列表
   * @param baseUrl 基础 URL
   * @returns 模型列表
   */
  async function fetchOllamaModels(baseUrl: string): Promise<Omit<Model, "platform_id">[]> {
    // 确保 baseUrl 末尾没有斜杠，然后拼接路径
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/api/tags`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const error: ApiError = new Error(
        `获取模型失败：${response.status} ${response.statusText}. 内容：${errorBody}`
      );
      error.status = response.status;
      error.statusText = response.statusText;
      error.body = errorBody;
      throw error;
    }

    const result = await response.json();

    // Ollama API 返回格式：{ models: [{ name: string, ... }] }
    if (result.models && Array.isArray(result.models)) {
      return result.models.map((model: { name: string }) => ({
        id: -1, // 临时 ID，由后端分配实际 ID
        name: model.name,
        alias: model.name,
        isDirty: true, // 需要保存
      }));
    } else {
      const error: ApiError = new Error('无效的 Ollama API 响应格式。期望得到 "models" 数组。');
      error.status = 400;
      error.statusText = "Invalid Response Format";
      error.body = JSON.stringify(result);
      throw error;
    }
  }

  /**
   * 从 Azure OpenAI API 获取模型列表
   * @param baseUrl 基础 URL
   * @param apiKey API 密钥
   * @returns 模型列表
   */
  async function fetchAzureOpenAIModels(
    baseUrl: string,
    apiKey: string
  ): Promise<Omit<Model, "platform_id">[]> {
    // 确保 baseUrl 末尾没有斜杠，然后拼接路径
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/openai/deployments?api-version=2023-03-15-preview`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const error: ApiError = new Error(
        `获取模型失败：${response.status} ${response.statusText}. 内容：${errorBody}`
      );
      error.status = response.status;
      error.statusText = response.statusText;
      error.body = errorBody;
      throw error;
    }

    const result = await response.json();

    // Azure OpenAI API 返回格式：{ data: [{ id: string, ... }] }
    if (result.data && Array.isArray(result.data)) {
      return result.data.map((model: { id: string }) => ({
        id: -1, // 临时 ID，由后端分配实际 ID
        name: model.id,
        alias: model.id,
        isDirty: true, // 需要保存
      }));
    } else {
      const error: ApiError = new Error('无效的 Azure OpenAI API 响应格式。期望得到 "data" 数组。');
      error.status = 400;
      error.statusText = "Invalid Response Format";
      error.body = JSON.stringify(result);
      throw error;
    }
  }

  /**
   * 更新供应商的模型信息。
   * @param {number} providerId - 供应商 ID。
   * @param {number} modelId - 模型 ID。
   * @param {Partial<Omit<Model, 'id' | 'platform_id'>>} data - 要更新的模型数据。
   * @returns {Promise<Model>} 更新后的模型信息。
   */
  async function updateModel(
    providerId: number,
    modelId: number,
    data: Partial<Omit<Model, "id" | "platform_id">>
  ): Promise<Model> {
    isFetchingModels.value = true;
    try {
      const updatedModel = await supplierApi.updateModel(providerId, modelId, data);

      // 更新 currentSupplier 中的模型数据
      if (currentSupplier.value) {
        const modelIndex = currentSupplier.value.models.findIndex(
          (m) => m.name === updatedModel.name
        );
        if (modelIndex !== -1) {
          currentSupplier.value.models[modelIndex] = {
            id: updatedModel.id,
            name: updatedModel.name,
            alias: updatedModel.alias || "",
            isDirty: false, // 更新后重置脏标记
          };
        }
      }

      return updatedModel;
    } finally {
      isFetchingModels.value = false;
    }
  }

  // =================================================================
  // Return - 导出
  // =================================================================

  return {
    // State
    suppliers: readonly(suppliers),
    isLoading: readonly(isLoading),
    isFetchingModels: readonly(isFetchingModels),
    currentSupplier, // 表单需要双向绑定，所以不设为 readonly
    isApiKeyDirty: readonly(isApiKeyDirty),

    // Actions
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    initNewSupplier,
    loadSupplierForEdit,
    loadSupplierApiKey,
    fetchModelsByProviderId,
    fetchModelsFromProvider,
    fetchModelsFromProviderOnly,
    updateModel,
    markApiKeyAsDirty,
  };
});
