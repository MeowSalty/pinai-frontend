import type { HealthStatus } from './health'

/**
 * 资源健康状态计数（对应后端 ResourceHealthCount）
 */
export interface ResourceHealthCount {
  available: number
  warning: number
  unavailable: number
  unknown: number
}

export interface RateLimitConfig {
  rpm: number
  tpm: number
}

/**
 * 端点 (Endpoint) - 平台的具体 API 端点配置
 */
export interface Endpoint {
  id?: number
  platform_id?: number
  endpoint_type: string
  endpoint_variant: string
  path: string
  custom_headers?: Record<string, string>
  is_default: boolean
  isDirty?: boolean
  tempId?: string // 客户端临时 ID，用于端点未保存时的关联
}

/**
 * 平台 (Platform) - 代表一个具体的服务提供商
 * 对应 API 返回的平台数据结构
 */
export interface Platform {
  id: number
  name: string
  base_url: string
  rate_limit: RateLimitConfig
  endpoints?: Endpoint[]
}

/**
 * 带健康状态的平台接口
 * 当 API 请求包含 include=health 参数时返回此类型
 */
export interface PlatformWithHealth extends Platform {
  health_status?: HealthStatus
  key_count?: number
  model_count?: number
  key_health_count?: ResourceHealthCount
  model_health_count?: ResourceHealthCount
}

/**
 * 模型 (Model) - 属于特定平台的 AI 模型
 */
export interface Model {
  id: number
  platform_id: number
  name: string
  alias: string
  api_keys?: ApiKey[] // 模型关联的密钥列表（多对多关系）
  isDirty?: boolean
}

/**
 * 带健康状态的模型接口
 * 当 API 请求包含 include=health 参数时返回此类型
 */
export interface ModelWithHealth extends Model {
  health_status?: HealthStatus
}

/**
 * API 密钥 (ApiKey) - 用于平台服务认证
 */
export interface ApiKey {
  id: number
  platform_id: number
  value: string
  tempId?: string // 客户端临时 ID，用于在密钥未保存到后端前进行关联
}

/**
 * 带健康状态的密钥接口
 * 当 API 请求包含 include=health 参数时返回此类型
 */
export interface KeyWithHealth extends ApiKey {
  health_status?: HealthStatus
}

/**
 * 创建供应方请求 - 用于一次性创建平台、模型和密钥
 * 对应 POST /api/providers
 */
export interface ProviderCreateRequest {
  platform: Omit<Platform, 'id'>
  models: Omit<Model, 'id' | 'platform_id' | 'isDirty' | 'api_keys'>[]
  apiKeys: Pick<ApiKey, 'value'>[]
}

/**
 * 更新平台请求 - 用于更新平台基本信息
 * 对应 PUT /api/platforms/{id}
 */
export interface PlatformUpdateRequest {
  name?: string
  base_url?: string
  rate_limit?: RateLimitConfig
  endpoints?: Endpoint[]
}

/**
 * 前端编辑供应方时使用的数据结构
 * 包含平台、模型和密钥的完整信息
 */
export interface ProviderUpdateRequest {
  platform: Omit<Platform, 'id'> & { isDirty?: boolean }
  models: Omit<Model, 'platform_id'>[] // 保留 id、api_keys 等字段
  apiKeys: (Pick<ApiKey, 'value'> & {
    id?: number | null
    isDirty?: boolean
    tempId?: string
    health_status?: HealthStatus // 新增健康状态字段
  })[]
  deletedModelIds?: number[] // 记录被删除的模型 ID
  deletedApiKeyIds?: number[] // 记录被删除的密钥 ID
  deletedEndpointIds?: number[] // 记录被删除的端点 ID
}
