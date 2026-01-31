export interface ProxyRequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  timeout_ms?: number;
}

export interface ProxyResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: unknown;
}
