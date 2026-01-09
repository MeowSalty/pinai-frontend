import type { ApiError } from "@/types/api";

/**
 * 从错误响应体中提取详细信息
 * @param body 响应体字符串
 * @param maxLength 最大长度限制
 * @returns 提取的错误消息
 */
function extractErrorMessage(body: string, maxLength: number = 200): string {
  if (!body) return "";

  try {
    const parsed = JSON.parse(body);

    // 优先使用 error.message
    if (parsed.error && typeof parsed.error.message === "string") {
      const message = parsed.error.message;
      return message.length > maxLength ? message.substring(0, maxLength) + "..." : message;
    }

    // 其次使用 message
    if (typeof parsed.message === "string") {
      const message = parsed.message;
      return message.length > maxLength ? message.substring(0, maxLength) + "..." : message;
    }

    // 再次使用 error 字符串
    if (typeof parsed.error === "string") {
      const message = parsed.error;
      return message.length > maxLength ? message.substring(0, maxLength) + "..." : message;
    }

    // 如果都没有，返回完整 JSON（限制长度）
    const jsonStr = JSON.stringify(parsed);
    return jsonStr.length > maxLength ? jsonStr.substring(0, maxLength) + "..." : jsonStr;
  } catch {
    // JSON 解析失败，返回原始内容（限制长度）
    return body.length > maxLength ? body.substring(0, maxLength) + "..." : body;
  }
}

/**
 * 统一错误处理函数
 * @param error 错误对象
 * @param operation 操作描述
 * @returns 错误消息内容
 */
export function handleApiError(error: unknown, operation: string): string {
  const apiError = error as ApiError;

  // 特殊错误类型（保持不变）
  if (apiError.isServerNotSelected) {
    return `${operation}失败：未选择 API 服务器`;
  } else if (apiError.isTimeout) {
    return `${operation}失败：请求超时，请检查网络连接`;
  } else if (apiError.isAuthError) {
    return `${operation}失败：未授权，请检查 Token`;
  }

  // HTTP 错误（增强信息）
  if (apiError.status) {
    const statusCode = `[${apiError.status}]`;
    const detailMessage = apiError.body ? extractErrorMessage(apiError.body) : "";

    if (detailMessage) {
      return `${operation}失败 ${statusCode}：${detailMessage}`;
    }

    // 如果没有详细信息，使用通用消息
    if (apiError.status >= 500) {
      return `${operation}失败 ${statusCode}：服务器内部错误`;
    } else if (apiError.status >= 400) {
      return `${operation}失败 ${statusCode}：请求参数错误`;
    }
  }

  // 其他错误
  if (error instanceof Error) {
    return `${operation}失败：${error.message}`;
  }

  return `${operation}失败：未知错误`;
}
