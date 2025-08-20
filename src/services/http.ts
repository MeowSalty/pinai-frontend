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

    // 使用 URL 对象安全地构造 URL
    const fullUrl = new URL(url, activeServer.url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(fullUrl.toString(), {
        ...config,
        signal: controller.signal,
        headers: { "Content-Type": "application/json", ...config.headers },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const error = new Error(
          `HTTP 错误：${response.status} ${response.statusText}. 内容：${errorBody}`
        ) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        error.body = errorBody;
        throw error;
      }
      return await response.json();
    } catch (error: unknown) {
      // 处理超时错误
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error('请求超时，请检查网络连接') as ApiError;
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
