/**
 * 单个资源类型的健康状态统计
 * 包含总数和各健康状态的计数
 */
export interface HealthStatusCount {
  total: number;
  available: number;
  warning: number;
  unavailable: number;
  unknown: number;
}

/**
 * 健康状态摘要响应
 * 包含平台、API 密钥和模型的健康统计
 */
export interface HealthSummary {
  platform: HealthStatusCount;
  api_key: HealthStatusCount;
  model: HealthStatusCount;
}
