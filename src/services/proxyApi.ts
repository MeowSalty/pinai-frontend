import { http } from "@/services/http";
import type { ApiError } from "@/types/api";
import type { ProxyRequestConfig, ProxyResponse } from "@/types/proxy";

function createApiError(status: number, statusText: string, body: string): ApiError {
  const error: ApiError = new Error(`获取模型失败：${status} ${statusText}. 内容：${body}`);
  error.status = status;
  error.statusText = statusText;
  error.body = body;
  return error;
}

function normalizeProxyBody(body: unknown): unknown {
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return body;
    }
  }
  return body;
}

function normalizeProxyResponse(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  if ("body" in payload) {
    const proxyPayload = payload as ProxyResponse;
    if (typeof proxyPayload.status === "number" && proxyPayload.status >= 400) {
      const bodyText =
        typeof proxyPayload.body === "string"
          ? proxyPayload.body
          : JSON.stringify(proxyPayload.body ?? "");
      throw createApiError(proxyPayload.status, proxyPayload.statusText ?? "Proxy Error", bodyText);
    }
    return normalizeProxyBody(proxyPayload.body);
  }

  return payload;
}

function withDefaultHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...headers,
  };
}

export function isFailedToFetchError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return true;
  }
  return error instanceof Error && error.message.includes("Failed to fetch");
}

export async function requestExternalJson(
  config: ProxyRequestConfig,
  useProxy: boolean,
): Promise<unknown> {
  const normalizedConfig: ProxyRequestConfig = {
    ...config,
    method: "GET",
    headers: withDefaultHeaders(config.headers),
    timeout_ms: config.timeout_ms ?? 30000,
  };

  if (useProxy) {
    const proxyResponse = await http.post<unknown>("/api/proxy", normalizedConfig);
    return normalizeProxyResponse(proxyResponse);
  }

  const fetchOptions: RequestInit = {
    method: normalizedConfig.method,
    headers: normalizedConfig.headers,
  };

  if (normalizedConfig.method !== "GET" && normalizedConfig.body !== undefined) {
    fetchOptions.body = JSON.stringify(normalizedConfig.body);
  }

  const response = await fetch(normalizedConfig.url, fetchOptions);

  if (!response.ok) {
    const errorBody = await response.text();
    throw createApiError(response.status, response.statusText, errorBody);
  }

  return await response.json();
}
