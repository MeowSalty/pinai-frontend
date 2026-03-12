import type { ApiKey, ProviderCreateRequest } from "@/types/provider";
import type { RenameRule } from "@/types/rename";
import { providerApi } from "@/services/providerApi";
import { handleApiError } from "@/utils/errorHandler";
import { applyRulesToName } from "@/utils/rename";
import { buildEndpoints } from "./endpoints";
import type { ImportItem, KeyFetchResult, ModelWithKeyIndices } from "./types";

interface ProviderStoreLike {
  currentProvider: {
    platform: {
      name: string;
      base_url: string;
      rate_limit: { rpm: number; tpm: number };
      endpoints?: Array<{
        endpoint_type: string;
        endpoint_variant: string;
        path: string;
        is_default: boolean;
      }>;
    };
    apiKeys: Array<{ value: string }>;
    models: Array<{ name?: string }>;
  } | null;
  fetchModelsFromProviderOnly: () => Promise<Array<{ name: string }>>;
  loadProviders: () => Promise<void>;
}

interface RenameRulesStoreLike {
  rules: RenameRule[];
}

interface ProcessImportOptions {
  autoFetchModels: boolean;
  autoRenameModels: boolean;
  keyFetchIntervalMs?: number;
  onProgress?: (item: ImportItem) => void;
}

export const createProviderWithKeyAssociations = async (
  payload: {
    platform: {
      name: string;
      base_url: string;
      rate_limit: { rpm: number; tpm: number };
      endpoints?: Array<{
        endpoint_type: string;
        endpoint_variant: string;
        path: string;
        is_default: boolean;
      }>;
    };
    apiKeys: ProviderCreateRequest["apiKeys"];
    models: ProviderCreateRequest["models"];
  },
  modelsWithKeyIndices: ModelWithKeyIndices[],
  store: ProviderStoreLike,
): Promise<void> => {
  const createdPlatform = await providerApi.createPlatform(payload.platform);
  const platformId = createdPlatform.id;
  console.log(`[批量导入] 创建新平台，ID: ${platformId}`);

  const createdKeys: ApiKey[] = [];
  console.log(`[批量导入] 创建 ${payload.apiKeys.length} 个新密钥`);
  for (const apiKeyData of payload.apiKeys) {
    const createdKey = await providerApi.createProviderKey(platformId, apiKeyData);
    createdKeys.push(createdKey);
  }

  console.log(`[批量导入] 准备创建 ${modelsWithKeyIndices.length} 个模型`);
  const modelsToCreate = modelsWithKeyIndices
    .map((modelData) => {
      const associatedKeyIds = modelData.keyIndices
        .map((idx) => {
          if (idx < createdKeys.length) {
            return createdKeys[idx]?.id;
          }
          return undefined;
        })
        .filter((id): id is number => id !== undefined && id !== null && id > 0);

      if (associatedKeyIds.length > 0) {
        return {
          name: modelData.name,
          alias: modelData.alias,
          api_keys: associatedKeyIds.map((id) => ({ id })),
        };
      }
      return null;
    })
    .filter((model): model is NonNullable<typeof model> => model !== null);

  if (modelsToCreate.length > 0) {
    await providerApi.createModelsBatch(platformId, modelsToCreate);
    console.log(`[批量导入] 成功创建 ${modelsToCreate.length} 个模型`);
  }

  await store.loadProviders();
};

const fetchModelsForItem = async (
  item: ImportItem,
  currentItem: ImportItem,
  store: ProviderStoreLike,
  keyFetchIntervalMs = 5000,
): Promise<{ modelsWithKeyIndices: ModelWithKeyIndices[]; successKeyIndices: number[] }> => {
  const modelsToCreate: ModelWithKeyIndices[] = [];
  const successKeyIndices: number[] = [];
  const modelKeyMap = new Map<string, Set<number>>();

  const waitForInterval = async (intervalMs: number) => {
    if (intervalMs <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  };

  for (let keyIndex = 0; keyIndex < item.data!.apiKeys.length; keyIndex++) {
    const apiKey = item.data!.apiKeys[keyIndex];

    if (apiKey === undefined) {
      currentItem.keyResults!.push({
        keyIndex,
        keyValue: "（缺失）",
        status: "failed",
        error: "密钥缺失，已跳过该密钥",
      });
      continue;
    }

    const keyResult: KeyFetchResult = {
      keyIndex,
      keyValue: apiKey,
      status: "fetching",
    };
    currentItem.keyResults!.push(keyResult);

    store.currentProvider = {
      platform: {
        name: item.data!.name,
        base_url: item.data!.base_url,
        rate_limit: { rpm: 0, tpm: 0 },
        endpoints: buildEndpoints(item.data!.provider, item.data!.variant),
      },
      apiKeys: [{ value: apiKey }],
      models: [],
    };

    try {
      const fetchedModels = await store.fetchModelsFromProviderOnly();
      keyResult.status = "success";
      keyResult.modelCount = fetchedModels.length;
      keyResult.models = fetchedModels.map((model) => model.name);
      successKeyIndices.push(keyIndex);

      fetchedModels.forEach((model) => {
        if (!modelKeyMap.has(model.name)) {
          modelKeyMap.set(model.name, new Set());
        }
        modelKeyMap.get(model.name)!.add(keyIndex);
      });
    } catch (error) {
      keyResult.status = "failed";
      keyResult.error = handleApiError(error, "获取模型");
    }

    if (keyIndex < item.data!.apiKeys.length - 1) {
      await waitForInterval(keyFetchIntervalMs);
    }
  }

  for (const [modelName, keyIndices] of modelKeyMap.entries()) {
    modelsToCreate.push({
      name: modelName,
      alias: "",
      keyIndices: Array.from(keyIndices),
    });
  }

  return { modelsWithKeyIndices: modelsToCreate, successKeyIndices };
};

const applyRenameRules = (
  modelsWithKeyIndices: ModelWithKeyIndices[],
  renameRulesStore: RenameRulesStoreLike,
): ModelWithKeyIndices[] => {
  const { rules } = renameRulesStore;
  return modelsWithKeyIndices.map((model) => {
    const newName = applyRulesToName(model.name, rules, (error, rule) => {
      console.warn("应用重命名规则失败：", { error, rule });
    });
    const alias = newName !== model.name ? newName : "";
    return { name: model.name, alias, keyIndices: model.keyIndices };
  });
};

export const processImportItems = async (
  itemsToProcess: ImportItem[],
  importList: ImportItem[],
  store: ProviderStoreLike,
  renameRulesStore: RenameRulesStoreLike,
  options: ProcessImportOptions,
) => {
  const { autoFetchModels, autoRenameModels, onProgress } = options;

  for (const item of itemsToProcess) {
    if (!item.data) continue;

    const currentItem = importList.find((entry) => entry.id === item.id);
    if (!currentItem) continue;

    currentItem.status = "导入中";
    currentItem.error = undefined;
    currentItem.createError = undefined;
    currentItem.keyResults = [];
    onProgress?.(currentItem);

    try {
      let modelsToCreate: ModelWithKeyIndices[] = [];
      let successKeyIndices: number[] = [];

      if (autoFetchModels && item.data.apiKeys.length > 0) {
        const fetchResult = await fetchModelsForItem(
          item,
          currentItem,
          store,
          options.keyFetchIntervalMs ?? 5000,
        );
        modelsToCreate = fetchResult.modelsWithKeyIndices;
        successKeyIndices = fetchResult.successKeyIndices;

        if (successKeyIndices.length === 0) {
          currentItem.status = "失败";
          currentItem.error = "所有密钥获取模型均失败";
          continue;
        }

        if (autoRenameModels && modelsToCreate.length > 0) {
          modelsToCreate = applyRenameRules(modelsToCreate, renameRulesStore);
        }
      }

      const keysToCreate =
        successKeyIndices.length > 0
          ? successKeyIndices
              .map((index) => item.data!.apiKeys[index])
              .filter((key): key is string => key !== undefined)
          : item.data.apiKeys;

      if (keysToCreate.length === 0) {
        currentItem.status = "失败";
        currentItem.error = "缺少有效密钥，已跳过创建";
        continue;
      }

      const payload = {
        platform: {
          name: item.data.name,
          base_url: item.data.base_url,
          rate_limit: { rpm: 0, tpm: 0 },
          endpoints: buildEndpoints(item.data.provider, item.data.variant),
        },
        apiKeys: keysToCreate.map((value) => ({ value })),
        models: modelsToCreate.map((model) => ({ name: model.name, alias: model.alias })),
      };

      await createProviderWithKeyAssociations(payload, modelsToCreate, store);
      currentItem.status = "成功";
    } catch (error) {
      currentItem.status = "失败";
      currentItem.createError = handleApiError(error, "创建失败");
    } finally {
      store.currentProvider = null;
    }
  }
};
