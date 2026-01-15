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
 * 资源类型枚举
 * 1 = 平台，2 = API 密钥，3 = 模型
 */
export enum HealthResourceType {
  Platform = 1,
  APIKey = 2,
  Model = 3,
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

/**
 * 启用/禁用模型响应
 */
export interface ModelToggleResponse {
  message: string;
  model_id: number;
  status: string;
}

/**
 * 启用/禁用平台响应
 */
export interface PlatformToggleResponse {
  message: string;
  platform_id: number;
  status: string;
}

/**
 * 启用/禁用密钥响应
 */
export interface KeyToggleResponse {
  message: string;
  key_id: number;
  status: string;
}

/**
 * 健康问题项
 * 表示一个存在问题的资源
 */
export interface HealthIssueItem {
  resource_type: HealthResourceType;
  resource_id: number;
  resource_name: string;
  status: HealthStatus;
  last_check_at: string;
  last_error: string;
}

/**
 * 健康问题列表响应
 */
export interface HealthIssuesResponse {
  items: HealthIssueItem[];
}
