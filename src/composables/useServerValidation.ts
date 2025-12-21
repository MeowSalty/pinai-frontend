import type { ValidationResult } from "@/types/api";

/**
 * 服务器验证 composable
 */
export function useServerValidation() {
  /**
   * 验证服务器连接
   * @param url - 服务器 URL
   * @param token - 可选的认证 token
   * @returns 验证结果，包含成功状态和可选的 HTTP 状态码
   */
  const validateServerConnection = async (
    url: string,
    token?: string
  ): Promise<ValidationResult> => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(`${url}/api/ping`, {
          signal: controller.signal,
          headers,
        });

        clearTimeout(timeoutId);
        return { success: response.ok, status: response.status };
      } catch {
        clearTimeout(timeoutId);
        return { success: false };
      }
    } catch {
      return { success: false };
    }
  };

  return { validateServerConnection };
}
