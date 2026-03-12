import { http } from '@/services/http'
import type {
  RequestStat,
  ListRequestStatsOptions,
  RealtimeStats,
  DashboardResponse,
} from '@/types/stats'

// 获取实时数据
export async function getRealtimeStats(): Promise<RealtimeStats> {
  return http.get<RealtimeStats>('/api/stats/realtime')
}

// 获取仪表盘数据（统一接口）
export async function getDashboard(range: string = '24h'): Promise<DashboardResponse> {
  return http.get<DashboardResponse>(`/api/stats/dashboard?range=${range}`)
}

// 获取请求状态列表
export async function listRequestStats(options: ListRequestStatsOptions): Promise<{
  data: RequestStat[]
  count: number
}> {
  // 构建查询参数
  const params = new URLSearchParams()

  // 添加分页参数
  params.append('page', options.page.toString())
  params.append('page_size', options.page_size.toString())

  // 添加可选筛选参数
  if (options.start_time) {
    params.append('start_time', options.start_time)
  }
  if (options.end_time) {
    params.append('end_time', options.end_time)
  }
  if (options.success !== undefined) {
    params.append('success', options.success.toString())
  }
  if (options.is_stream !== undefined) {
    params.append('is_stream', options.is_stream.toString())
  }
  if (options.is_native !== undefined) {
    params.append('is_native', options.is_native.toString())
  }
  // 旧参数（已弃用）：保留向后兼容
  if (options.request_type) {
    params.append('request_type', options.request_type)
  }
  if (options.model_name) {
    params.append('model_name', options.model_name)
  }
  if (options.platform_id !== undefined) {
    params.append('platform_id', options.platform_id.toString())
  }

  const queryString = params.toString()
  const url = `/api/stats/requests${queryString ? `?${queryString}` : ''}`

  // 后端返回的是包含分页信息的对象
  return await http.get<{
    data: RequestStat[]
    count: number
  }>(url)
}
