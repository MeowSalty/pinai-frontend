export interface RateLimitConfig {
  rpm: number;
  tpm: number;
}

/**
 * 平台 (Platform) - 代表一个具体的服务提供商
 * 对应 API 返回的平台数据结构
 */
export interface Platform {
  id: number;
  name: string;
  format: string;
  base_url: string;
  rate_limit: RateLimitConfig;
}


/**
 * 模型 (Model) - 属于特定平台的 AI 模型
 */
export interface Model {
  id: number;
  platform_id: number;
  name: string;
  alias: string;
  isDirty?: boolean;
}

/**
 * API 密钥 (ApiKey) - 用于平台服务认证
 */
export interface ApiKey {
  id: number;
  platform_id: number;
  value: string;
}

/**
 * 创建供应方请求 - 用于一次性创建平台、模型和密钥
 * 对应 POST /api/providers
 */
export interface ProviderCreateRequest {
  platform: Omit<Platform, "id">;
  models: Omit<Model, "id" | "platform_id" | "isDirty">[];
  apiKey: Pick<ApiKey, "value">;
}

/**
 * 更新平台请求 - 用于更新平台基本信息
 * 对应 PUT /api/platforms/{id}
 */
export interface PlatformUpdateRequest {
  name?: string;
  format?: string;
  base_url?: string;
  rate_limit?: RateLimitConfig;
}

/**
 * 前端编辑供应方时使用的数据结构
 * 包含平台、模型和密钥的完整信息
 */
export interface ProviderUpdateRequest {
  platform: Omit<Platform, "id"> & { isDirty?: boolean };
  models: Omit<Model, "platform_id">[]; // 保留 id 字段
  apiKey: Pick<ApiKey, "value"> & { id?: number | null };
}
