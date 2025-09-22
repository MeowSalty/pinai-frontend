import type { ApiError } from "@/types/api";

/**
 * 统一错误处理函数
 * @param error 错误对象
 * @param operation 操作描述
 * @returns 错误消息内容
 */
export function handleApiError(error: unknown, operation: string): string {
  const apiError = error as ApiError;

  if (apiError.isTimeout) {
    return `${operation}失败：请求超时，请检查网络连接`;
  } else if (apiError.isAuthError) {
    return `${operation}失败：未授权，请检查 Token`;
  } else if (apiError.status && apiError.status >= 500) {
    return `${operation}失败：服务器内部错误，请稍后重试`;
  } else if (apiError.status && apiError.status >= 400) {
    return `${operation}失败：请求参数错误，请检查后重试`;
  } else if (error instanceof Error) {
    return `${operation}失败：` + error.message;
  } else {
    return `${operation}失败：未知错误`;
  }
}
