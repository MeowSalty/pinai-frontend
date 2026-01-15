import { http } from "@/services/http";
import type {
  HealthIssuesResponse,
  HealthSummary,
  KeyToggleResponse,
  ModelHealthListParams,
  ModelHealthListResponse,
  ModelToggleResponse,
  PlatformToggleResponse,
} from "@/types/health";

/**
 * 健康状态 API 服务层
 * 负责与后端健康状态相关的 HTTP 通信
 */
export const healthApi = {
  /**
   * 获取健康状态摘要
   * 包含平台、API 密钥和模型的健康统计信息
   * @returns {Promise<HealthSummary>} 健康状态统计数据
   */
  getHealthSummary(): Promise<HealthSummary> {
    return http.get<HealthSummary>("/api/health/summary");
  },

  /**
   * 获取模型健康状态列表
   * @param params 分页参数
   * @returns {Promise<ModelHealthListResponse>} 模型健康状态列表
   */
  getModelHealthList(params?: ModelHealthListParams): Promise<ModelHealthListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.page_size) searchParams.set("page_size", String(params.page_size));

    const queryString = searchParams.toString();
    const url = queryString ? `/api/health/models?${queryString}` : "/api/health/models";

    return http.get<ModelHealthListResponse>(url);
  },

  /**
   * 启用指定模型
   * @param modelId 模型 ID
   * @returns {Promise<ModelToggleResponse>} 启用结果
   */
  enableModel(modelId: number): Promise<ModelToggleResponse> {
    return http.post<ModelToggleResponse>(`/api/health/models/${modelId}/enable`, {});
  },

  /**
   * 禁用指定模型
   * 禁用后模型状态会被设置为 unavailable
   * @param modelId 模型 ID
   * @returns {Promise<ModelToggleResponse>} 禁用结果
   */
  disableModel(modelId: number): Promise<ModelToggleResponse> {
    return http.post<ModelToggleResponse>(`/api/health/models/${modelId}/disable`, {});
  },

  /**
   * 启用指定平台
   * @param platformId 平台 ID
   * @returns {Promise<PlatformToggleResponse>} 启用结果
   */
  enablePlatform(platformId: number): Promise<PlatformToggleResponse> {
    return http.post<PlatformToggleResponse>(`/api/health/platforms/${platformId}/enable`, {});
  },

  /**
   * 禁用指定平台
   * 禁用后平台状态会被设置为 unavailable
   * @param platformId 平台 ID
   * @returns {Promise<PlatformToggleResponse>} 禁用结果
   */
  disablePlatform(platformId: number): Promise<PlatformToggleResponse> {
    return http.post<PlatformToggleResponse>(`/api/health/platforms/${platformId}/disable`, {});
  },

  /**
   * 启用指定 API 密钥
   * @param keyId 密钥 ID
   * @returns {Promise<KeyToggleResponse>} 启用结果
   */
  enableKey(keyId: number): Promise<KeyToggleResponse> {
    return http.post<KeyToggleResponse>(`/api/health/keys/${keyId}/enable`, {});
  },

  /**
   * 禁用指定 API 密钥
   * 禁用后密钥状态会被设置为 unavailable
   * @param keyId 密钥 ID
   * @returns {Promise<KeyToggleResponse>} 禁用结果
   */
  disableKey(keyId: number): Promise<KeyToggleResponse> {
    return http.post<KeyToggleResponse>(`/api/health/keys/${keyId}/disable`, {});
  },

  /**
   * 获取健康问题列表
   * 返回所有存在问题的资源（状态为不可用）
   * @returns {Promise<HealthIssuesResponse>} 健康问题列表
   */
  getHealthIssues(): Promise<HealthIssuesResponse> {
    return http.get<HealthIssuesResponse>("/api/health/issues");
  },
};
