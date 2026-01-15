/**
 * 健康状态枚举
 * 0 = 未知，1 = 可用，2 = 警告，3 = 不可用
 */
export enum HealthStatus {
  Unknown = 0,
  Available = 1,
  Warning = 2,
  Unavailable = 3,
}

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

/**
 * 模型健康状态项
 */
export interface ModelHealthItem {
  model_id: number;
  model_name: string;
  model_alias: string;
  status: HealthStatus;
  retry_count: number;
  last_error: string;
  last_check_at: string;
  last_success_at: string;
  success_count: number;
  error_count: number;
}

/**
 * 模型健康状态列表查询参数
 */
export interface ModelHealthListParams {
  page?: number;
  page_size?: number;
}

/**
 * 模型健康状态列表响应
 */
export interface ModelHealthListResponse {
  items: ModelHealthItem[];
  total: number;
  page: number;
  page_size: number;
}
