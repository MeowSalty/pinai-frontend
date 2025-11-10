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
  api_keys?: ApiKey[]; // 模型关联的密钥列表（多对多关系）
  isDirty?: boolean;
}

/**
 * API 密钥 (ApiKey) - 用于平台服务认证
 */
export interface ApiKey {
  id: number;
  platform_id: number;
  value: string;
  tempId?: string; // 客户端临时 ID，用于在密钥未保存到后端前进行关联
}

/**
 * 创建供应方请求 - 用于一次性创建平台、模型和密钥
 * 对应 POST /api/providers
 */
export interface ProviderCreateRequest {
  platform: Omit<Platform, "id">;
  models: Omit<Model, "id" | "platform_id" | "isDirty" | "api_keys">[];
  apiKeys: Pick<ApiKey, "value">[];
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
  models: Omit<Model, "platform_id">[]; // 保留 id、api_keys 等字段
  apiKeys: (Pick<ApiKey, "value"> & { id?: number | null; isDirty?: boolean; tempId?: string })[];
  deletedModelIds?: number[]; // 记录被删除的模型 ID
  deletedApiKeyIds?: number[]; // 记录被删除的密钥 ID
}
