import { http } from '@/services/http';
import type { Provider, ProviderCreateRequest, Model, ApiKey } from '@/types/provider';

/**
 * 供应商 API 服务层
 * 负责与后端 API 进行所有与供应商相关的 HTTP 通信。
 */
export const supplierApi = {
  /**
   * 获取所有供应商。
   * @returns {Promise<Provider[]>} 供应商列表。
   */
  getProviders(): Promise<Provider[]> {
    return http.get<Provider[]>('/api/providers');
  },

  /**
   * 获取单个供应商详细信息。
   * @param {number} id - 供应商 ID。
   * @returns {Promise<Provider>} 供应商详细信息。
   */
  getProviderById(id: number): Promise<Provider> {
    return http.get<Provider>(`/api/providers/${id}`);
  },

  /**
   * 创建一个新的供应商。
   * @param {ProviderCreateRequest} data - 创建供应商所需的数据。
   * @returns {Promise<Provider>} 创建成功的供应商信息。
   */
  createProvider(data: ProviderCreateRequest): Promise<Provider> {
    return http.post<Provider>('/api/providers', data);
  },

  /**
   * 更新一个已有的供应商。
   * @param {number} id - 要更新的供应商 ID。
   * @param {Partial<Omit<Provider, 'id'>>} data - 要更新的数据。
   * @returns {Promise<Provider>} 更新成功的供应商信息。
   */
  updateProvider(id: number, data: Partial<Omit<Provider, 'id'>>): Promise<Provider> {
    return http.put<Provider>(`/api/providers/${id}`, data);
  },

  /**
   * 删除一个供应商。
   * @param {number} id - 要删除的供应商 ID。
   * @returns {Promise<{ message: string }>} 删除操作的确认信息。
   */
  deleteProvider(id: number): Promise<{ message: string }> {
    return http.delete<{ message: string }>(`/api/providers/${id}`);
  },

  /**
   * 获取特定供应商的模型列表。
   * @param {number} providerId - 供应商 ID。
   * @returns {Promise<Model[]>} 模型列表。
   */
  getModelsByProvider(providerId: number): Promise<Model[]> {
    return http.get<Model[]>(`/api/providers/${providerId}/models`);
  },

  /**
   * 更新供应商的模型信息。
   * @param {number} providerId - 供应商 ID。
   * @param {number} modelId - 模型 ID。
   * @param {Partial<Omit<Model, 'id' | 'platform_id'>>} data - 要更新的模型数据。
   * @returns {Promise<Model>} 更新后的模型信息。
   */
  updateModel(
    providerId: number,
    modelId: number,
    data: Partial<Omit<Model, 'id' | 'platform_id'>>
  ): Promise<Model> {
    return http.put<Model>(`/api/providers/${providerId}/models/${modelId}`, data);
  },

  /**
   * 获取供应商的 API 密钥列表
   * @param {number} providerId - 供应商 ID
   * @returns {Promise<ApiKey[]>} API 密钥列表
   */
  getProviderKeys(providerId: number): Promise<ApiKey[]> {
    return http.get<ApiKey[]>(`/api/providers/${providerId}/keys`);
  },

  /**
   * 为供应商创建新的 API 密钥
   * @param {number} providerId - 供应商 ID
   * @param {Partial<Omit<ApiKey, 'id' | 'platform_id'>>} data - 密钥数据
   * @returns {Promise<ApiKey>} 创建成功的密钥信息（不包含 value 字段）
   */
  createProviderKey(
    providerId: number,
    data: Partial<Omit<ApiKey, 'id' | 'platform_id'>>
  ): Promise<ApiKey> {
    return http.post<ApiKey>(`/api/providers/${providerId}/keys`, data);
  },

  /**
   * 更新供应商的 API 密钥
   * @param {number} providerId - 供应商 ID
   * @param {number} keyId - 密钥 ID
   * @param {Partial<Omit<ApiKey, 'id' | 'platform_id'>>} data - 要更新的密钥数据
   * @returns {Promise<ApiKey>} 更新后的密钥信息（不包含 value 字段）
   */
  updateProviderKey(
    providerId: number,
    keyId: number,
    data: Partial<Omit<ApiKey, 'id' | 'platform_id'>>
  ): Promise<ApiKey> {
    return http.put<ApiKey>(`/api/providers/${providerId}/keys/${keyId}`, data);
  },
};
