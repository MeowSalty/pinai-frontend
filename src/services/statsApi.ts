import { http } from "@/services/http";
import type { StatsOverview } from "@/types/stats";

// 获取统计概览数据
export async function getStatsOverview(): Promise<StatsOverview> {
  return http.get<StatsOverview>("/api/stats/overview");
}
