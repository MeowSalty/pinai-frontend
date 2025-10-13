import { http } from "@/services/http";
import type {
  StatsOverview,
  RequestStat,
  ListRequestStatsOptions,
  RealtimeStats,
  ModelRankResponse,
  PlatformRankResponse,
} from "@/types/stats";

// 获取统计概览数据
export async function getStatsOverview(timeRange?: string): Promise<StatsOverview> {
  const params = new URLSearchParams();
  if (timeRange) {
    params.append("duration", timeRange);
  }
  const queryString = params.toString();
  const url = `/api/stats/overview${queryString ? `?${queryString}` : ""}`;
  return http.get<StatsOverview>(url);
}

// 获取实时数据
export async function getRealtimeStats(): Promise<RealtimeStats> {
  return http.get<RealtimeStats>("/api/stats/realtime");
}

// 获取请求状态列表
export async function listRequestStats(options: ListRequestStatsOptions): Promise<{
  data: RequestStat[];
  count: number;
}> {
  // 构建查询参数
  const params = new URLSearchParams();

  // 添加分页参数
  params.append("page", options.page.toString());
  params.append("page_size", options.page_size.toString());

  // 添加可选筛选参数
  if (options.start_time) {
    params.append("start_time", options.start_time);
  }
  if (options.end_time) {
    params.append("end_time", options.end_time);
  }
  if (options.success !== undefined) {
    params.append("success", options.success.toString());
  }
  if (options.request_type) {
    params.append("request_type", options.request_type);
  }
  if (options.model_name) {
    params.append("model_name", options.model_name);
  }

  const queryString = params.toString();
  const url = `/api/stats/requests${queryString ? `?${queryString}` : ""}`;

  // 后端返回的是包含分页信息的对象
  return await http.get<{
    data: RequestStat[];
    count: number;
  }>(url);
}

// 获取模型排名
export async function getModelRank(timeRange?: string): Promise<ModelRankResponse> {
  const params = new URLSearchParams();
  if (timeRange) {
    params.append("duration", timeRange);
  }
  const queryString = params.toString();
  const url = `/api/stats/models/rank${queryString ? `?${queryString}` : ""}`;
  return http.get<ModelRankResponse>(url);
}

// 获取平台排名
export async function getPlatformRank(timeRange?: string): Promise<PlatformRankResponse> {
  const params = new URLSearchParams();
  if (timeRange) {
    params.append("duration", timeRange);
  }
  const queryString = params.toString();
  const url = `/api/stats/platforms/rank${queryString ? `?${queryString}` : ""}`;
  return http.get<PlatformRankResponse>(url);
}
