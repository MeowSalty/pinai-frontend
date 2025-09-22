export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  body?: string;
  isTimeout?: boolean;
  isAuthError?: boolean;
}
