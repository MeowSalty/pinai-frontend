import { http } from '@/services/http';
import type { Provider, ProviderCreateRequest, Model } from '@/types/supplier';

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

};
