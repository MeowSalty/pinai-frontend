import { defineStore } from "pinia";
import { ref, readonly } from "vue";
import { providerApi } from "@/services/providerApi";
import type {
  Platform,
  Model,
  ProviderCreateRequest,
  ProviderUpdateRequest,
} from "@/types/provider";
import type { ApiError } from "@/types/api";

/**
 * 供应商管理 Store
 * 使用 Pinia Setup Store 风格，用于管理供应商数据的状态和业务逻辑。
 */
export const useProviderStore = defineStore("provider", () => {
  // =================================================================
  // State - 状态
  // =================================================================

  /**
   * 从我方后端获取的平台 (供应商) 列表。
   */
  const providers = ref<Platform[]>([]);

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
  const currentProvider = ref<ProviderUpdateRequest | null>(null);

  /**
   * 存储当前正在编辑的供应商 (平台) 的 ID。
   */
  const editingProviderId = ref<number | null>(null);

  /**
   * 标记密钥是否被修改过（脏状态）。
   */
  const isApiKeyDirty = ref(false);

  // =================================================================
  // Actions - 操作
  // =================================================================

  // --- 与我方后端的 CRUD 操作 ---

  /**
   * 异步获取所有平台 (供应商) 并更新 `providers` 状态。
   * @returns {Promise<void>}
   */
  async function fetchProviders(): Promise<void> {
    isLoading.value = true;
    try {
      const data = await providerApi.getPlatforms();
      providers.value = data;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 向我方后端发送创建供应方的请求。
   * @param {ProviderCreateRequest} data - 创建供应方所需的数据。
   * @returns {Promise<void>}
   */
  async function createProvider(data: ProviderCreateRequest): Promise<void> {
    isLoading.value = true;
    try {
      await providerApi.createProvider(data);
      await fetchProviders(); // 成功后刷新列表
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 向我方后端发送更新供应方相关信息的请求。
   * @param {ProviderUpdateRequest} data - 要更新的数据。
   * @returns {Promise<void>}
   */
  async function updateProvider(data: ProviderUpdateRequest): Promise<void> {
    if (editingProviderId.value === null) {
      throw new Error("更新失败：未指定编辑供应商的 ID");
    }
    isLoading.value = true;
    try {
      // 1. 只在供应商平台信息被修改时才更新
      if (data.platform.isDirty) {
        await providerApi.updatePlatform(editingProviderId.value, data.platform);
      }

      // 2. 处理被删除的密钥
      if (data.deletedApiKeyIds && data.deletedApiKeyIds.length > 0) {
        for (const keyId of data.deletedApiKeyIds) {
          await providerApi.deleteProviderKey(editingProviderId.value, keyId);
        }
      }

      // 3. 处理密钥变更：新增密钥和更新现有密钥
      if (isApiKeyDirty.value && data.apiKeys) {
        const dirtyKeys = data.apiKeys.filter((k) => k.isDirty);
        for (const key of dirtyKeys) {
          if (key.value) {
            if (key.id) {
              // 更新现有密钥
              await providerApi.updateProviderKey(editingProviderId.value, key.id, {
                value: key.value,
              });
            } else {
              // 创建新密钥
              const createdKey = await providerApi.createProviderKey(editingProviderId.value, {
                value: key.value,
              });
              console.log("创建密钥成功：", createdKey);

              // 更新模型中该密钥的关联 ID
              if (key.tempId && currentProvider.value) {
                const oldTempId = key.tempId;
                const newKeyId = createdKey.id;

                // 更新密钥本身的 ID
                key.id = newKeyId;
                key.tempId = undefined;

                // 更新所有关联该 tempId 的模型
                currentProvider.value.models.forEach((model) => {
                  if (model.api_keys) {
                    model.api_keys.forEach((modelKey) => {
                      if (modelKey.tempId === oldTempId) {
                        modelKey.id = newKeyId;
                        modelKey.tempId = undefined;
                      }
                    });
                  }
                });
              }
            }
          }
        }
      }

      // 4. 处理被删除的模型
      if (data.deletedModelIds && data.deletedModelIds.length > 0) {
        for (const modelId of data.deletedModelIds) {
          await providerApi.deleteModel(editingProviderId.value, modelId);
        }
      }

      // 5. 处理模型变更：新增模型和更新现有模型
      if (data.models) {
        const dirtyModels = data.models.filter((m) => m.isDirty);

        // 分离新增模型和更新模型
        const newModels = dirtyModels.filter((m) => m.id === -1);
        const updateModels = dirtyModels.filter((m) => m.id > 0);

        // 5.1 处理新增模型（使用现有的批量创建 API）
        if (newModels.length > 0) {
          const modelsWithKeys = newModels.map((model) => {
            const apiKeyIds: { id: number }[] = [];

            if (model.api_keys && model.api_keys.length > 0) {
              model.api_keys.forEach((modelKey) => {
                // 如果密钥 ID 大于 0，直接使用
                if (modelKey.id && modelKey.id > 0) {
                  apiKeyIds.push({ id: modelKey.id });
                } else if (modelKey.tempId) {
                  // 如果有 tempId，从平台密钥中查找对应的已保存密钥
                  const matchedKey = currentProvider.value?.apiKeys.find(
                    (k) => k.tempId === modelKey.tempId && k.id && k.id > 0
                  );
                  if (matchedKey && matchedKey.id) {
                    apiKeyIds.push({ id: matchedKey.id });
                  }
                }
              });
            }

            return {
              name: model.name,
              alias: model.alias,
              api_keys: apiKeyIds,
            };
          });

          const batchResult = await providerApi.createModelsBatch(
            editingProviderId.value,
            modelsWithKeys
          );

          // 更新新创建的模型 ID
          newModels.forEach((model, index) => {
            if (index < batchResult.models.length) {
              model.id = batchResult.models[index].id;
            }
          });
        }

        // 5.2 处理更新模型（使用批量更新 API）
        if (updateModels.length > 0) {
          // 准备批量更新数据
          const batchUpdateData = updateModels.map((model) => {
            const updateItem: {
              id: number;
              name?: string;
              alias?: string;
              api_keys?: Array<{ id: number }>;
            } = {
              id: model.id,
              name: model.name,
              alias: model.alias,
            };

            // 如果模型有关联的密钥，添加到更新数据中
            if (model.api_keys && model.api_keys.length > 0) {
              const validApiKeys: { id: number }[] = [];

              model.api_keys.forEach((k) => {
                if (k.id && k.id > 0) {
                  // 有效的密钥 ID
                  validApiKeys.push({ id: k.id });
                } else if (k.tempId) {
                  // 通过 tempId 查找已保存的密钥
                  const matchedKey = currentProvider.value?.apiKeys.find(
                    (platformKey) =>
                      platformKey.tempId === k.tempId && platformKey.id && platformKey.id > 0
                  );
                  if (matchedKey && matchedKey.id) {
                    validApiKeys.push({ id: matchedKey.id });
                  }
                }
              });

              if (validApiKeys.length > 0) {
                updateItem.api_keys = validApiKeys;
              }
            }

            return updateItem;
          });

          // 如果只有一个模型需要更新，使用单个更新 API（保持原有逻辑）
          if (batchUpdateData.length === 1) {
            const updateData: Partial<Omit<Model, "id" | "platform_id">> = {
              name: batchUpdateData[0].name,
              alias: batchUpdateData[0].alias,
            };

            if (batchUpdateData[0].api_keys) {
              (updateData as Record<string, unknown>).api_keys = batchUpdateData[0].api_keys;
            }

            await providerApi.updateModel(
              editingProviderId.value,
              batchUpdateData[0].id,
              updateData
            );
          }
          // 如果有多个模型需要更新，使用批量更新 API
          else if (batchUpdateData.length > 1) {
            await providerApi.updateModelsBatch(editingProviderId.value, batchUpdateData);
          }
        }

        // 重置所有模型的脏标记
        dirtyModels.forEach((model) => {
          model.isDirty = false;
        });
      }

      // 6. 重置脏状态标记
      isApiKeyDirty.value = false;
      if (data.platform.isDirty) {
        data.platform.isDirty = false;
      }

      // 7. 成功后刷新列表
      await fetchProviders();
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 向我方后端发送删除供应方的请求。
   * @param {number} id - 要删除的供应方 ID。
   * @returns {Promise<void>}
   */
  async function deletePlatform(id: number): Promise<void> {
    isLoading.value = true;
    try {
      await providerApi.deletePlatform(id);
      await fetchProviders(); // 成功后刷新列表
    } finally {
      isLoading.value = false;
    }
  }

  // --- 表单数据处理 ---

  /**
   * 初始化一个新的供应方对象用于表单。
   */
  function initNewProvider(): void {
    editingProviderId.value = null;
    isApiKeyDirty.value = false;
    currentProvider.value = {
      platform: {
        name: "",
        format: "", // 默认值
        base_url: "",
        rate_limit: { rpm: 0, tpm: 0 },
        custom_headers: {}, // 初始化为空对象
        isDirty: true, // 新建时默认为脏状态，因为需要创建
      },
      models: [],
      apiKeys: [],
      deletedModelIds: [], // 初始化删除列表
      deletedApiKeyIds: [], // 初始化删除的密钥 ID 列表
    };
  }

  /**
   * 加载一个已有的供应方数据到表单中以供编辑。
   * @param {number} id - 要编辑的供应方 (平台) ID。
   */
  async function loadProviderForEdit(id: number): Promise<void> {
    const provider = providers.value.find((s: Platform) => s.id === id);
    if (provider) {
      editingProviderId.value = id;
      isApiKeyDirty.value = false;
      currentProvider.value = {
        platform: {
          name: provider.name,
          format: provider.format,
          base_url: provider.base_url,
          rate_limit: provider.rate_limit,
          custom_headers: provider.custom_headers || {}, // 加载现有的 custom_headers 或初始化为空对象
          isDirty: false, // 初始化为未修改状态
        },
        // API 密钥初始为空数组，需要单独加载
        apiKeys: [],
        models: [], // 初始化为空数组，后续由 fetchModelsByProviderId 填充
        deletedModelIds: [], // 初始化删除列表
        deletedApiKeyIds: [], // 初始化删除的密钥 ID 列表
      };
    } else {
      throw new Error(`ID 为 ${id} 的供应商未找到`);
    }
  }

  /**
   * 加载供应商的 API 密钥
   * @param {number} id - 供应商 (平台) ID
   * @returns {Promise<void>}
   */
  async function loadProviderApiKey(id: number): Promise<void> {
    try {
      const keys = await providerApi.getProviderKeys(id);

      if (currentProvider.value) {
        // 加载所有密钥
        currentProvider.value.apiKeys = keys.map((key) => ({
          value: key.value,
          id: key.id,
          isDirty: false,
          tempId: undefined, // 已保存的密钥不需要 tempId
        }));
      }

      console.log("加载供应商密钥成功：", {
        id,
        keyCount: keys.length,
      });
    } catch (error) {
      console.warn("获取供应商密钥失败：", error);
      // 密钥获取失败时，保持为空数组
      if (currentProvider.value) {
        currentProvider.value.apiKeys = [];
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
   * @param {number} providerId - 供应商 (平台) ID。
   * @returns {Promise<Model[]>} - 返回模型列表。
   */
  async function fetchModelsByProviderId(providerId: number): Promise<Model[]> {
    isFetchingModels.value = true;
    try {
      const models = await providerApi.getModelsByProvider(providerId);
      if (currentProvider.value) {
        currentProvider.value.models = models.map((m) => ({
          ...m,
          id: m.id, // 保留原始 ID
          name: m.name,
          alias: m.alias,
          api_keys: m.api_keys || [], // 保留关联的密钥列表
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
    if (!currentProvider.value) {
      throw new Error("无法获取模型，currentProvider 未初始化。");
    }

    const { platform, apiKeys } = currentProvider.value;
    const apiKey = apiKeys[0]?.value || "";

    isFetchingModels.value = true;
    try {
      let models: Omit<Model, "id" | "platform_id">[] = [];

      // 根据不同的供应商格式使用不同的请求方法
      switch (platform.format) {
        case "OpenAI":
          models = await fetchOpenAIModels(platform.base_url, apiKey);
          break;
        case "Ollama":
          models = await fetchOllamaModels(platform.base_url);
          break;
        case "Azure OpenAI":
          models = await fetchAzureOpenAIModels(platform.base_url, apiKey);
          break;
        case "Gemini":
          models = await fetchGeminiModels(platform.base_url, apiKey);
          break;
        case "Anthropic":
          models = await fetchAnthropicModels(platform.base_url, apiKey);
          break;
        default:
          throw new Error(`不支持的供应商格式：${platform.format}`);
      }

      // 返回处理后的模型列表而不是直接更新
      // 新获取的模型默认关联所有平台密钥（包括有 tempId 的新密钥）
      const platformApiKeys = currentProvider.value?.apiKeys || [];
      const defaultApiKeys = platformApiKeys
        .filter((key) => (key.id && key.id > 0) || key.tempId)
        .map((key) => ({
          id: key.id || 0,
          platform_id: 0, // 临时值
          value: "", // 不返回实际值
          tempId: key.tempId, // 保留 tempId
        }));

      return models.map((m) => ({
        ...m,
        id: -1, // 新模型使用临时 ID
        platform_id: 0, // 临时 platform_id
        api_keys: defaultApiKeys, // 默认关联所有密钥
        isDirty: true, // 新模型默认需要保存
      })) as Model[];
    } finally {
      isFetchingModels.value = false;
    }
  }

  /**
   * 使用指定密钥从外部供应商 API 获取可用模型列表
   * @param {string} keyValue - API 密钥值
   * @param {object} keyInfo - API 密钥信息（包含 id 和 tempId）
   * @returns {Promise<Model[]>}
   */
  async function fetchModelsFromProviderByKey(
    keyValue: string,
    keyInfo: { id: number; tempId?: string }
  ): Promise<Model[]> {
    if (!currentProvider.value) {
      throw new Error("无法获取模型，currentProvider 未初始化。");
    }

    const { platform } = currentProvider.value;

    isFetchingModels.value = true;
    try {
      let models: Omit<Model, "id" | "platform_id">[] = [];

      // 根据不同的供应商格式使用不同的请求方法
      switch (platform.format) {
        case "OpenAI":
          models = await fetchOpenAIModels(platform.base_url, keyValue);
          break;
        case "Ollama":
          models = await fetchOllamaModels(platform.base_url);
          break;
        case "Azure OpenAI":
          models = await fetchAzureOpenAIModels(platform.base_url, keyValue);
          break;
        case "Gemini":
          models = await fetchGeminiModels(platform.base_url, keyValue);
          break;
        case "Anthropic":
          models = await fetchAnthropicModels(platform.base_url, keyValue);
          break;
        default:
          throw new Error(`不支持的供应商格式：${platform.format}`);
      }

      // 处理模型关联：只关联到当前密钥，如果模型已存在则添加关联
      const existingModels = currentProvider.value.models || [];

      return models.map((m) => {
        const existingModel = existingModels.find((em) => em.name === m.name);

        if (existingModel && existingModel.id > 0) {
          // 模型已存在，添加新的密钥关联
          // 使用 id 或 tempId 来判断密钥是否已存在
          const existingKeyIdentifiers = new Set(
            existingModel.api_keys?.map((k) => k.tempId || String(k.id)) || []
          );
          const updatedApiKeys = [...(existingModel.api_keys || [])];
          const newKeyIdentifier = keyInfo.tempId || String(keyInfo.id);

          if (!existingKeyIdentifiers.has(newKeyIdentifier)) {
            updatedApiKeys.push({
              id: keyInfo.id,
              tempId: keyInfo.tempId,
              platform_id: 0,
              value: "",
            });
          }

          return {
            id: existingModel.id,
            platform_id: 0,
            name: existingModel.name,
            alias: existingModel.alias,
            api_keys: updatedApiKeys,
            isDirty: true,
          } as Model;
        } else {
          // 新模型，只关联到当前密钥
          return {
            id: -1,
            platform_id: 0,
            name: m.name,
            alias: m.alias,
            api_keys: [
              {
                id: keyInfo.id,
                tempId: keyInfo.tempId,
                platform_id: 0,
                value: "",
              },
            ],
            isDirty: true,
          } as Model;
        }
      });
    } finally {
      isFetchingModels.value = false;
    }
  }

  /**
   * 从外部供应商 API 获取可用模型列表。
   * @returns {Promise<void>}
   */
  async function fetchModelsFromProvider(): Promise<void> {
    if (!currentProvider.value) {
      throw new Error("无法获取模型，currentProvider 未初始化。");
    }

    const { platform, apiKeys } = currentProvider.value;
    const apiKey = apiKeys[0]?.value || "";

    isFetchingModels.value = true;
    try {
      let models: Omit<Model, "id" | "platform_id">[] = [];

      // 根据不同的供应商格式使用不同的请求方法
      switch (platform.format) {
        case "OpenAI":
          models = await fetchOpenAIModels(platform.base_url, apiKey);
          break;
        case "Ollama":
          models = await fetchOllamaModels(platform.base_url);
          break;
        case "Azure OpenAI":
          models = await fetchAzureOpenAIModels(platform.base_url, apiKey);
          break;
        case "Gemini":
          models = await fetchGeminiModels(platform.base_url, apiKey);
          break;
        case "Anthropic":
          models = await fetchAnthropicModels(platform.base_url, apiKey);
          break;
        default:
          throw new Error(`不支持的供应商格式：${platform.format}`);
      }

      if (currentProvider.value) {
        // 新获取的模型默认关联所有平台密钥（包括有 tempId 的新密钥）
        const platformApiKeys = currentProvider.value.apiKeys || [];
        const defaultApiKeys = platformApiKeys
          .filter((key) => (key.id && key.id > 0) || key.tempId)
          .map((key) => ({
            id: key.id || 0,
            platform_id: 0, // 临时值
            value: "", // 不返回实际值
            tempId: key.tempId, // 保留 tempId
          }));

        currentProvider.value.models = models.map((m) => ({
          ...m,
          id: -1, // 新模型使用临时 ID
          api_keys: defaultApiKeys, // 默认关联所有密钥
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
   * 从 Gemini API 获取模型列表
   * @param baseUrl 基础 URL
   * @param apiKey API 密钥
   * @returns 模型列表
   */
  async function fetchGeminiModels(
    baseUrl: string,
    apiKey: string
  ): Promise<Omit<Model, "platform_id">[]> {
    // 确保 baseUrl 末尾没有斜杠，然后拼接路径
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=1000`;

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

    // Gemini API 返回格式：{ models: [{ name: string, ... }] }
    if (result.models && Array.isArray(result.models)) {
      return result.models.map((model: { name: string }) => ({
        id: -1, // 临时 ID，由后端分配实际 ID
        name: model.name,
        alias: model.name,
        isDirty: true, // 需要保存
      }));
    } else {
      const error: ApiError = new Error('无效的 Gemini API 响应格式。期望得到 "models" 数组。');
      error.status = 400;
      error.statusText = "Invalid Response Format";
      error.body = JSON.stringify(result);
      throw error;
    }
  }

  /**
   * 从 Anthropic API 获取模型列表
   * @param baseUrl 基础 URL
   * @param apiKey API 密钥
   * @returns 模型列表
   */
  async function fetchAnthropicModels(
    baseUrl: string,
    apiKey: string
  ): Promise<Omit<Model, "platform_id">[]> {
    // 确保 baseUrl 末尾没有斜杠，然后拼接路径
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/v1/models`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
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

    // Anthropic API 返回格式与 OpenAI 类似：{ data: [{ id: string, ... }] }
    if (result.data && Array.isArray(result.data)) {
      return result.data.map((model: { id: string }) => ({
        id: -1, // 临时 ID，由后端分配实际 ID
        name: model.id,
        alias: "",
        isDirty: true, // 需要保存
      }));
    } else {
      const error: ApiError = new Error('无效的 Anthropic API 响应格式。期望得到 "data" 数组。');
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
      const updatedModel = await providerApi.updateModel(providerId, modelId, data);

      // 更新 currentProvider 中的模型数据
      if (currentProvider.value) {
        const modelIndex = currentProvider.value.models.findIndex(
          (m) => m.name === updatedModel.name
        );
        if (modelIndex !== -1) {
          currentProvider.value.models[modelIndex] = {
            id: updatedModel.id,
            name: updatedModel.name,
            alias: updatedModel.alias || "",
            api_keys: updatedModel.api_keys || [], // 保留密钥关联
            isDirty: false, // 更新后重置脏标记
          };
        }
      }

      return updatedModel;
    } finally {
      isFetchingModels.value = false;
    }
  }

  /**
   * 批量处理模型变更：删除被移除的模型，创建新增的模型
   * @param {number} providerId - 供应商 ID
   * @param {Model[]} selectedModels - 需要保留和新增的模型
   * @param {Model[]} removedModels - 需要删除的模型
   * @returns {Promise<{ addedCount: number; removedCount: number }>} 返回新增和删除的模型数量
   */
  async function applyModelChanges(
    providerId: number,
    selectedModels: Model[],
    removedModels: Model[]
  ): Promise<{ addedCount: number; removedCount: number }> {
    isFetchingModels.value = true;
    try {
      let addedCount = 0;
      let removedCount = 0;

      // 1. 只有在有需要删除的模型时才执行删除操作
      if (removedModels.length > 0) {
        for (const model of removedModels) {
          if (model.id > 0) {
            // 只删除已保存的模型（ID > 0）
            await providerApi.deleteModel(providerId, model.id);
            removedCount++;
          }
        }
      }

      // 2. 只有在有需要新增的模型时才执行新增操作
      if (selectedModels.length > 0) {
        for (const model of selectedModels) {
          if (model.id === -1) {
            // 只创建新增的模型（ID 为 -1）
            const platformApiKeys = currentProvider.value?.apiKeys || [];
            const apiKeyIds = platformApiKeys
              .filter((key) => key.id && key.id > 0) // 只包含已保存的密钥 ID，新密钥在提交时会先创建
              .map((key) => ({ id: key.id! }));

            const createdModel = await providerApi.createModel(providerId, {
              name: model.name,
              alias: model.alias,
              api_keys: apiKeyIds,
            });
            // 更新模型 ID 为后端分配的 ID
            model.id = createdModel.id;
            model.isDirty = false; // 重置脏标记
            addedCount++;
          }
        }
      }

      // 3. 只有在有实际变更时才刷新当前供应商的模型列表
      if (
        (removedCount > 0 || addedCount > 0) &&
        editingProviderId.value === providerId &&
        currentProvider.value
      ) {
        await fetchModelsByProviderId(providerId);
      }

      return { addedCount, removedCount };
    } finally {
      isFetchingModels.value = false;
    }
  }

  // =================================================================
  // Return - 导出
  // =================================================================

  return {
    // State
    providers: readonly(providers),
    isLoading: readonly(isLoading),
    isFetchingModels: readonly(isFetchingModels),
    currentProvider, // 表单需要双向绑定，所以不设为 readonly
    editingProviderId: readonly(editingProviderId),
    isApiKeyDirty: readonly(isApiKeyDirty),

    // Actions
    fetchProviders,
    createProvider,
    updateProvider,
    deletePlatform,
    initNewProvider,
    loadProviderForEdit,
    loadProviderApiKey,
    fetchModelsByProviderId,
    fetchModelsFromProvider,
    fetchModelsFromProviderOnly,
    fetchModelsFromProviderByKey,
    updateModel,
    markApiKeyAsDirty,
    applyModelChanges,
  };
});
