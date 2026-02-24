import type { FlatImportResult, ImportItem, ImportStatus } from "./types";
import { STATUS_LABELS } from "./constants";

export const getItemKeyCount = (item: ImportItem) => item.data?.apiKeys?.length || 1;

const getDisplayVariant = (provider: string, variant: string) => {
  return provider === "NewAPI" || provider === "OneAPI" ? "N/A" : variant;
};

export const buildFlatResults = (items: ImportItem[]): FlatImportResult[] => {
  const results: FlatImportResult[] = [];

  for (const item of items) {
    if (!item.data) {
      results.push({
        key: `${item.id}-error`,
        provider: "",
        variant: "",
        name: "",
        base_url: "",
        apiKey: "",
        status: item.status,
        message: item.error,
      });
      continue;
    }

    const displayVariant = getDisplayVariant(item.data.provider, item.data.variant);

    if (item.data.apiKeys.length === 0) {
      results.push({
        key: `${item.id}-0`,
        provider: item.data.provider,
        variant: displayVariant,
        name: item.data.name,
        base_url: item.data.base_url,
        apiKey: "无密钥",
        status: item.status,
        message: item.status === STATUS_LABELS.success ? "导入成功" : item.error,
      });
      continue;
    }

    const keyResultMap = item.keyResults
      ? new Map(item.keyResults.map((result) => [result.keyIndex, result]))
      : null;

    item.data.apiKeys.forEach((apiKey, index) => {
      const keyResult = keyResultMap?.get(index);
      let message = "";
      let rowStatus: ImportStatus = item.status;

      if (keyResult) {
        if (keyResult.status === "success") {
          if (item.status === STATUS_LABELS.success) {
            message = `获取 ${keyResult.modelCount} 个模型`;
          } else if (item.createError) {
            message = item.createError;
          }
        } else if (keyResult.status === "failed") {
          message = keyResult.error || "获取模型失败";
          if (item.status === STATUS_LABELS.success) {
            rowStatus = STATUS_LABELS.failed;
          }
        } else if (keyResult.status === "fetching") {
          message = "获取中...";
        }
      } else {
        message = item.status === STATUS_LABELS.success ? "导入成功" : item.error || "";
      }

      results.push({
        key: `${item.id}-${index}`,
        provider: item.data!.provider,
        variant: displayVariant,
        name: item.data!.name,
        base_url: item.data!.base_url,
        apiKey,
        status: rowStatus,
        message,
        keyIndex: index,
      });
    });
  }

  return results;
};
