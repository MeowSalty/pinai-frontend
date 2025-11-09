import { http } from "@/services/http";
import type {
  Platform,
  ProviderCreateRequest,
  PlatformUpdateRequest,
  Model,
  ApiKey,
} from "@/types/provider";

/**
 * 供应商 API 服务层
 * 负责与后端 API 进行所有与供应商相关的 HTTP 通信。
 */
export const providerApi = {
  // --- Provider ---
  /**
   * 创建一个新的供应方 (平台 + 模型 + 密钥)。
   * @param {ProviderCreateRequest} data - 创建供应方所需的数据。
   * @returns {Promise<Platform>} 创建成功的平台信息。
   */
  createProvider(data: ProviderCreateRequest): Promise<Platform> {
    return http.post<Platform>("/api/providers", data);
  },

  // --- Platform ---
  /**
   * 删除一个平台及其所有关联资源。
   * @param {number} id - 要删除的平台 ID。
   * @returns {Promise<void>} 删除操作成功（204 No Content）。
   */
  deletePlatform(id: number): Promise<void> {
    return http.delete<void>(`/api/platforms/${id}`);
  },

  /**
   * 创建一个新的平台（不包括模型和密钥）。
   * @param {Omit<Platform, 'id'>} data - 平台数据。
   * @returns {Promise<Platform>} 创建成功的平台信息（包含 id）。
   */
  createPlatform(data: Omit<Platform, "id">): Promise<Platform> {
    return http.post<Platform>("/api/platforms", data);
  },

  /**
   * 获取所有平台。
   * @returns {Promise<Platform[]>} 平台列表。
   */
  getPlatforms(): Promise<Platform[]> {
    return http.get<Platform[]>("/api/platforms");
  },

  /**
   * 获取单个平台详细信息。
   * @param {number} id - 平台 ID。
   * @returns {Promise<Platform>} 平台详细信息。
   */
  getPlatformById(id: number): Promise<Platform> {
    return http.get<Platform>(`/api/platforms/${id}`);
  },

  /**
   * 更新一个已有的平台。
   * @param {number} id - 要更新的平台 ID。
   * @param {PlatformUpdateRequest} data - 要更新的数据。
   * @returns {Promise<Platform>} 更新成功的平台信息。
   */
  updatePlatform(id: number, data: PlatformUpdateRequest): Promise<Platform> {
    return http.put<Platform>(`/api/platforms/${id}`, data);
  },

  // --- Model ---
  /**
   * 获取特定平台的模型列表。
   * @param {number} providerId - 供应方 (平台) ID。
   * @returns {Promise<Model[]>} 模型列表。
   */
  getModelsByProvider(providerId: number): Promise<Model[]> {
    return http.get<Model[]>(`/api/platforms/${providerId}/models`);
  },

  /**
   * 为平台添加新的模型。
   * @param {number} providerId - 供应方 (平台) ID。
   * @param {Partial<Omit<Model, 'id' | 'platform_id'>>} data - 要添加的模型数据。
   * @returns {Promise<Model>} 添加成功的模型信息。
   */
  createModel(
    providerId: number,
    data: Partial<Omit<Model, "id" | "platform_id" | "api_keys">> & {
      api_keys: Array<{ id: number }>;
    }
  ): Promise<Model> {
    return http.post<Model>(`/api/platforms/${providerId}/models`, data);
  },

  /**
   * 更新平台的模型信息。
   * @param {number} providerId - 供应方 (平台) ID。
   * @param {number} modelId - 模型 ID。
   * @param {Partial<Omit<Model, 'id' | 'platform_id'>>} data - 要更新的模型数据。
   * @returns {Promise<Model>} 更新后的模型信息。
   */
  updateModel(
    providerId: number,
    modelId: number,
    data: Partial<Omit<Model, "id" | "platform_id">>
  ): Promise<Model> {
    return http.put<Model>(`/api/platforms/${providerId}/models/${modelId}`, data);
  },

  /**
   * 删除平台的模型。
   * @param {number} providerId - 供应方 (平台) ID。
   * @param {number} modelId - 模型 ID。
   * @returns {Promise<{ message: string }>} 删除操作的确认信息。
   */
  deleteModel(providerId: number, modelId: number): Promise<{ message: string }> {
    return http.delete<{ message: string }>(`/api/platforms/${providerId}/models/${modelId}`);
  },

  /**
   * 批量为平台添加模型（原子性事务）。
   * @param {number} providerId - 供应方 (平台) ID。
   * @param {Array} models - 要批量创建的模型数据数组。
   * @returns {Promise<{models: Model[], total_count: number, created_count: number}>} 批量创建结果。
   */
  createModelsBatch(
    providerId: number,
    models: Array<
      Partial<Omit<Model, "id" | "platform_id" | "api_keys">> & {
        api_keys: Array<{ id: number }>;
      }
    >
  ): Promise<{ models: Model[]; total_count: number; created_count: number }> {
    return http.post<{ models: Model[]; total_count: number; created_count: number }>(
      `/api/platforms/${providerId}/models/batch`,
      { models }
    );
  },

  // --- ApiKey ---
  /**
   * 获取平台的 API 密钥列表 (不含密钥值)。
   * @param {number} providerId - 供应方 (平台) ID。
   * @returns {Promise<ApiKey[]>} API 密钥列表。
   */
  getProviderKeys(providerId: number): Promise<ApiKey[]> {
    return http.get<ApiKey[]>(`/api/platforms/${providerId}/keys`);
  },

  /**
   * 为平台创建新的 API 密钥。
   * @param {number} providerId - 供应方 (平台) ID。
   * @param {Partial<Omit<ApiKey, 'id' | 'platform_id'>>} data - 密钥数据。
   * @returns {Promise<ApiKey>} 创建成功的密钥信息（不包含 value 字段）。
   */
  createProviderKey(
    providerId: number,
    data: Partial<Omit<ApiKey, "id" | "platform_id">>
  ): Promise<ApiKey> {
    return http.post<ApiKey>(`/api/platforms/${providerId}/keys`, data);
  },

  /**
   * 更新平台的 API 密钥。
   * @param {number} providerId - 供应方 (平台) ID。
   * @param {number} keyId - 密钥 ID。
   * @param {Partial<Omit<ApiKey, 'id' | 'platform_id'>>} data - 要更新的密钥数据。
   * @returns {Promise<ApiKey>} 更新后的密钥信息（不包含 value 字段）。
   */
  updateProviderKey(
    providerId: number,
    keyId: number,
    data: Partial<Omit<ApiKey, "id" | "platform_id">>
  ): Promise<ApiKey> {
    return http.put<ApiKey>(`/api/platforms/${providerId}/keys/${keyId}`, data);
  },

  /**
   * 删除平台的密钥。
   * @param {number} providerId - 供应方 (平台) ID。
   * @param {number} keyId - 密钥 ID。
   * @returns {Promise<{ message: string }>} 删除操作的确认信息。
   */
  deleteProviderKey(providerId: number, keyId: number): Promise<{ message: string }> {
    return http.delete<{ message: string }>(`/api/platforms/${providerId}/keys/${keyId}`);
  },
};
