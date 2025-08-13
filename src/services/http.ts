import { useApiServerStore } from "@/stores/apiServerStore";

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
        throw new Error(`HTTP 错误：${response.status}`);
      }
      return await response.json();
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
}

export const http = new HttpClient();
