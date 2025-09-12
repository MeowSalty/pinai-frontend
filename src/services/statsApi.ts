import { http } from "@/services/http";
import type { StatsOverview, RequestStat, ListRequestStatsOptions } from "@/types/stats";

// 获取统计概览数据
export async function getStatsOverview(): Promise<StatsOverview> {
  return http.get<StatsOverview>("/api/stats/overview");
}

// 获取请求状态列表
export async function listRequestStats(options: ListRequestStatsOptions): Promise<{
  data: RequestStat[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
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
    page: number;
    page_size: number;
    total_pages: number;
  }>(url);
}
