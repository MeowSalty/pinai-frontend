export interface StatsOverview {
  total_requests: number;
  success_rate: number;
  avg_first_byte: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
}

// 实时统计数据
export interface RealtimeStats {
  rpm: number;
  active_connections: number;
}

// 添加请求状态相关类型定义
export interface RequestStat {
  id: number;
  timestamp: string; // ISO 8601 格式时间字符串
  request_type: string; // "stream" 或 "non-stream"
  model_name: string;
  original_model_name: string;
  platform_id: number;
  api_key_id: number;
  model_id: number;
  duration: number; // 毫秒
  first_byte_time?: number; // 毫秒，仅流式请求
  success: boolean;
  error_msg?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface ListRequestStatsOptions {
  start_time?: string; // ISO 8601 格式时间字符串
  end_time?: string; // ISO 8601 格式时间字符串
  success?: boolean;
  request_type?: string;
  model_name?: string;
  platform_id?: number; // 平台 ID 筛选参数
  page: number;
  page_size: number;
}

// 模型调用排行
export interface ModelCallRankItem {
  model_name: string;
  request_count: number;
  success_rate: number;
  percentage: number;
}

export interface ModelCallRankResponse {
  total_requests: number;
  models: ModelCallRankItem[];
}

// 平台调用排行
export interface PlatformCallRankItem {
  platform_name: string;
  request_count: number;
  success_rate: number;
  percentage: number;
}

export interface PlatformCallRankResponse {
  total_requests: number;
  platforms: PlatformCallRankItem[];
}

// 模型用量排行
export interface ModelUsageRankItem {
  model_name: string;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  percentage: number;
}

export interface ModelUsageRankResponse {
  total_tokens: number;
  models: ModelUsageRankItem[];
}

// 平台用量排行
export interface PlatformUsageRankItem {
  platform_name: string;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  percentage: number;
}

export interface PlatformUsageRankResponse {
  total_tokens: number;
  platforms: PlatformUsageRankItem[];
}
