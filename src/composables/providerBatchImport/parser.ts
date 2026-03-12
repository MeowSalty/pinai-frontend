import {
  ALLOWED_PROVIDERS,
  DEFAULT_VARIANTS,
  PROVIDER_TO_ENDPOINT_TYPE,
  SYSTEM_ENDPOINT_VARIANTS,
} from "./constants";
import type { ImportItem } from "./types";

const parseProviderWithVariant = (input: string) => {
  const providerMatch = input?.match(/^([^[]+)(?:\[([^\]]*)\])?$/);
  const provider = providerMatch?.[1]?.trim() || "";
  const variantInput = providerMatch?.[2]?.trim() || "";
  return { providerMatch, provider, variantInput };
};

const validateVariant = (provider: string, variant: string) => {
  if (provider === "OpenAI" && !variant) {
    return true;
  }
  if (provider === "NewAPI" || provider === "DoneHub") {
    return true;
  }
  const endpointType = PROVIDER_TO_ENDPOINT_TYPE[provider];
  // noUncheckedIndexedAccess 下索引访问可能得到 undefined；这里显式兜底
  // 若 provider 无法映射到 endpointType，则认为变体不受支持
  if (!endpointType) return false;

  const variants = SYSTEM_ENDPOINT_VARIANTS[endpointType] ?? [];
  return variants.includes(variant);
};

export const parseInputText = (text: string): ImportItem[] => {
  const trimmed = text.trim();
  if (!trimmed) return [];

  return trimmed.split("\n").map((line, index) => {
    const parts = line.split(",").map((value) => value.trim());
    const [providerWithVariant, name, base_url, ...apiKeys] = parts;
    const item: ImportItem = {
      id: index,
      line: index + 1,
      rawData: line,
      status: "待处理",
    };

    // parts 可能长度不足（noUncheckedIndexedAccess 下 providerWithVariant 为 string | undefined）
    if (!providerWithVariant) {
      item.status = "失败";
      item.error = "格式错误：缺少 API 类型";
      return item;
    }

    const { providerMatch, provider, variantInput } =
      parseProviderWithVariant(providerWithVariant);

    if (!providerMatch || !provider) {
      item.status = "失败";
      item.error = "格式错误：API 类型格式应为 类型 [变体]";
      return item;
    }

    if (!ALLOWED_PROVIDERS.has(provider)) {
      item.status = "失败";
      item.error = "格式错误：API 类型仅支持 OpenAI / Anthropic / Google / NewAPI / DoneHub";
      return item;
    }

    const variant =
      variantInput || (provider === "OpenAI" ? "" : (DEFAULT_VARIANTS[provider] ?? ""));

    if (!validateVariant(provider, variant)) {
      item.status = "失败";
      item.error = "格式错误：变体不受支持";
      return item;
    }

    if (!name || !base_url) {
      item.status = "失败";
      item.error = "格式错误：缺少 API 类型、名称或 API 端点";
      return item;
    }

    const validApiKeys = apiKeys.filter((key) => key && key.length > 0);
    item.data = { provider, variant, name, base_url, apiKeys: validApiKeys };
    return item;
  });
};
