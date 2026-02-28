export const DEFAULT_VARIANTS: Record<string, string> = {
  OpenAI: "chat_completions",
  Anthropic: "messages",
  Gemini: "generate",
  NewAPI: "chat_completions",
  DoneHub: "chat_completions",
};

export const ALLOWED_PROVIDERS = new Set(Object.keys(DEFAULT_VARIANTS));

export const PROVIDER_TO_ENDPOINT_TYPE: Record<string, string> = {
  OpenAI: "openai",
  Anthropic: "anthropic",
  Gemini: "google",
};

export const SYSTEM_ENDPOINT_VARIANTS: Record<string, string[]> = {
  openai: ["chat_completions", "responses"],
  google: ["generate"],
  anthropic: ["messages"],
};

export const MULTI_ENDPOINT_PROVIDERS = new Set(["NewAPI", "DoneHub"]);

export const STATUS_LABELS = {
  success: "成功",
  failed: "失败",
  importing: "导入中",
  pending: "待处理",
} as const;
