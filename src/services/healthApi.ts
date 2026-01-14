import { http } from "@/services/http";
import type { HealthSummary, ModelHealthListParams, ModelHealthListResponse } from "@/types/health";

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
};
