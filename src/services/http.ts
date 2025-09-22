import { useApiServerStore } from "@/stores/apiServerStore";
import type { ApiError } from "@/types/api";

// 在类外部实例化 store
const apiServerStore = useApiServerStore();

class HttpClient {
  async request<T>(url: string, config: RequestInit = {}): Promise<T> {
    const activeServer = apiServerStore.activeServer;

    if (!activeServer) {
      throw new Error("未选择 API 服务器");
    }

    // 构造完整 URL
    let fullUrl: string;
    if (!activeServer.url) {
      // 如果服务器 URL 为空，则使用当前域
      fullUrl = url.startsWith("/") ? url : `/${url}`;
    } else {
      // 使用 URL 对象安全地构造 URL
      const baseUrl = new URL(activeServer.url);
      fullUrl = new URL(url, baseUrl).toString();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // 构建请求头，包含可能的认证信息
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // 如果配置了请求头，则合并
      if (config.headers) {
        Object.assign(headers, config.headers);
      }

      // 如果配置了 Bearer Token，添加到请求头
      if (activeServer.token) {
        headers.Authorization = `Bearer ${activeServer.token}`;
      }

      const response = await fetch(fullUrl, {
        ...config,
        signal: controller.signal,
        headers,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const error = new Error(
          `HTTP 错误：${response.status} ${response.statusText}. 内容：${errorBody}`
        ) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        error.body = errorBody;

        // 如果是授权失败 (401)，标记服务器为需要重新认证
        if (response.status === 401) {
          error.isAuthError = true;
        }

        throw error;
      }
      return await response.json();
    } catch (error: unknown) {
      // 处理超时错误
      if (error instanceof Error && error.name === "AbortError") {
        const timeoutError = new Error("请求超时，请检查网络连接") as ApiError;
        timeoutError.isTimeout = true;
        throw timeoutError;
      }
      // 重新抛出其他错误
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  get<T>(url: string) {
    return this.request<T>(url);
  }

  post<T>(url: string, data: unknown) {
    return this.request<T>(url, { method: "POST", body: JSON.stringify(data) });
  }

  put<T>(url: string, data: unknown) {
    return this.request<T>(url, { method: "PUT", body: JSON.stringify(data) });
  }

  delete<T>(url: string) {
    return this.request<T>(url, { method: "DELETE" });
  }
}

export const http = new HttpClient();
