export interface StatsOverview {
  total_requests: number;
  success_rate: number;
  avg_first_byte: number;
}

// 实时统计数据
export interface RealtimeStats {
  rpm: number;
}

// 添加请求状态相关类型定义
export interface RequestStat {
  id: string;
  timestamp: string; // ISO 8601 格式时间字符串
  request_type: string; // "stream" 或 "non-stream"
  model_name: string;
  channel_info: {
    platform_id: number;
    api_key_id: number;
    model_id: number;
  };
  duration: number; // 毫秒
  first_byte_time?: number; // 毫秒，仅流式请求
  success: boolean;
  error_msg?: string;
  created_at: string;
  updated_at: string;
}

export interface ListRequestStatsOptions {
  start_time?: string; // ISO 8601 格式时间字符串
  end_time?: string; // ISO 8601 格式时间字符串
  success?: boolean;
  request_type?: string;
  model_name?: string;
  page: number;
  page_size: number;
}

// 模型调用排行
export interface ModelRankItem {
  model_name: string;
  request_count: number;
  success_rate: number;
  percentage: number;
}

export interface ModelRankResponse {
  total_requests: number;
  models: ModelRankItem[];
}

// 平台调用排行
export interface PlatformRankItem {
  platform_name: string;
  request_count: number;
  success_rate: number;
  percentage: number;
}

export interface PlatformRankResponse {
  total_requests: number;
  platforms: PlatformRankItem[];
}
