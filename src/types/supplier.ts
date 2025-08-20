export interface RateLimitConfig {
  rpm: number;
  tpm: number;
}

export interface Provider {
  id: number;
  name: string;
  format: string;
  base_url: string;
  rate_limit: RateLimitConfig;
}

export interface Model {
  id: number;
  platform_id: number;
  name: string;
  alias: string;
  isDirty?: boolean;
}

export interface ApiKey {
  id: number;
  platform_id: number;
  value: string;
}

export interface ProviderUpdateRequest {
  platform: Omit<Provider, "id">;
  models: Omit<Model, "platform_id">[]; // 保留 id 字段
  apiKey: Pick<ApiKey, "value">;
}

export interface ProviderCreateRequest {
  platform: Omit<Provider, "id">;
  models: Omit<Model, "id" | "platform_id">[];
  apiKey: Pick<ApiKey, "value">;
}
