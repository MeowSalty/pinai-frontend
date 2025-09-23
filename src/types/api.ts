export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  body?: string;
  isTimeout?: boolean;
  isAuthError?: boolean;
}

/**
 * API 服务器的类型定义
 */
export interface ApiServer {
  id: string;
  name: string;
  url: string;
  token?: string;
}
