import { http } from "@/services/http";
import type { HealthSummary } from "@/types/health";

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
};
