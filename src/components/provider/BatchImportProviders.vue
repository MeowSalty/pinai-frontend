<script setup lang="ts">
import { ref, computed } from "vue";
import { NTag } from "naive-ui";
import type { DataTableColumns } from "naive-ui";
import type { ApiKey } from "@/types/provider";
import { useProviderStore } from "@/stores/providerStore";
import { useRenameRulesStore } from "@/stores/renameRulesStore";
import { providerApi } from "@/services/providerApi";
import { handleApiError } from "@/utils/errorHandler";
import { applyRulesToName } from "@/utils/rename";

// 定义导入条目的状态
type ImportStatus = "待处理" | "导入中" | "成功" | "失败";

// 定义导入条目接口
interface ImportItem {
  id: number;
  line: number;
  rawData: string;
  status: ImportStatus;
  error?: string;
  data?: {
    format: string;
    name: string;
    base_url: string;
    apiKeys: string[]; // 支持多个密钥
  };
  // 创建状态跟踪：记录每个创建步骤的结果，支持断点续传式重试
  creationState?: {
    platformId?: number; // 已创建的平台 ID
    createdKeyIds?: number[]; // 已创建的密钥 ID 列表
    failedAt?: "fetch_models" | "platform" | "keys" | "models"; // 失败发生的阶段
  };
}

const emit = defineEmits<{
  (e: "close"): void;
  (e: "import-success"): void;
}>();

const store = useProviderStore();
const message = useMessage();

const inputText = ref("");
const autoFetchModels = ref(true);
const autoRenameModels = ref(true);
const importList = ref<ImportItem[]>([]);
const isImporting = ref(false);

const parsedItems = computed(() => {
  const lines = inputText.value.trim().split("\n");
  if (inputText.value.trim() === "") {
    return [];
  }
  return lines.map((line, index) => {
    const parts = line.split(",").map((s) => s.trim());
    const [format, name, base_url, ...apiKeys] = parts;
    const item: ImportItem = {
      id: index,
      line: index + 1,
      rawData: line,
      status: "待处理",
    };
    if (!format || !name || !base_url) {
      item.status = "失败";
      item.error = "格式错误：缺少 API 类型、名称或 API 端点";
    } else {
      // 过滤掉空的密钥
      const validApiKeys = apiKeys.filter((key) => key && key.length > 0);
      item.data = { format, name, base_url, apiKeys: validApiKeys };
    }
    return item;
  });
});

const hasFailedItems = computed(() => importList.value.some((item) => item.status === "失败"));

const getStatusType = (status: ImportStatus) => {
  switch (status) {
    case "成功":
      return "success";
    case "失败":
      return "error";
    case "导入中":
      return "warning";
    default:
      return "default";
  }
};

const processImport = async (itemsToProcess: ImportItem[]) => {
  isImporting.value = true;
  for (const item of itemsToProcess) {
    if (!item.data) continue;

    const currentItem = importList.value.find((i) => i.id === item.id);
    if (!currentItem) continue;

    currentItem.status = "导入中";
    currentItem.error = undefined;

    try {
      let modelsToCreate: Array<{ name: string; alias: string; keyIndices: number[] }> = [];

      // 1. 如果启用了自动获取模型且有密钥，则先获取模型
      if (autoFetchModels.value && item.data.apiKeys.length > 0) {
        // 使用 Map 记录每个模型与密钥索引的关联关系
        const modelKeyMap = new Map<string, Set<number>>();
        let fetchModelsSuccess = false;

        // 为每个密钥获取模型列表
        for (let keyIndex = 0; keyIndex < item.data.apiKeys.length; keyIndex++) {
          const apiKey = item.data.apiKeys[keyIndex];

          // 为了获取模型，需要临时设置 currentProvider
          store.currentProvider = {
            platform: {
              name: item.data.name,
              format: item.data.format,
              base_url: item.data.base_url,
              rate_limit: { rpm: 0, tpm: 0 },
            },
            apiKeys: [{ value: apiKey }],
            models: [],
          };

          try {
            const fetchedModels = await store.fetchModelsFromProviderOnly();

            // 记录每个模型与当前密钥的关联
            fetchedModels.forEach((model) => {
              if (!modelKeyMap.has(model.name)) {
                modelKeyMap.set(model.name, new Set());
              }
              modelKeyMap.get(model.name)!.add(keyIndex);
            });

            fetchModelsSuccess = true;
          } catch (error) {
            console.warn(`密钥 ${keyIndex + 1} 获取模型失败:`, error);
            // 继续处理其他密钥
          }
        }

        // 如果所有密钥都获取模型失败，抛出错误
        if (!fetchModelsSuccess && item.data.apiKeys.length > 0) {
          const error = new Error("所有密钥获取模型均失败");
          currentItem.creationState = { failedAt: "fetch_models" };
          throw error;
        }

        // 转换为最终格式
        const modelsWithKeyIndices: Array<{
          name: string;
          alias: string;
          keyIndices: number[];
        }> = [];

        for (const [modelName, keyIndices] of modelKeyMap.entries()) {
          modelsWithKeyIndices.push({
            name: modelName,
            alias: "",
            keyIndices: Array.from(keyIndices),
          });
        }

        // 2. 如果启用了自动重命名，则处理模型别名
        if (autoRenameModels.value && modelsWithKeyIndices.length > 0) {
          const renameRulesStore = useRenameRulesStore();
          const { rules } = renameRulesStore;

          modelsToCreate = modelsWithKeyIndices.map((model) => {
            const newName = applyRulesToName(model.name, rules, (error, rule) => {
              console.warn("应用重命名规则失败：", { error, rule });
            });
            // 只有当新名称与原始名称不同时，才设置别名
            const alias = newName !== model.name ? newName : "";
            return { name: model.name, alias, keyIndices: model.keyIndices };
          });
        } else {
          modelsToCreate = modelsWithKeyIndices;
        }
      }

      // 3. 构造最终的 payload 并创建供应商
      const payload = {
        platform: {
          name: item.data.name,
          format: item.data.format,
          base_url: item.data.base_url,
          rate_limit: { rpm: 0, tpm: 0 },
        },
        apiKeys: item.data.apiKeys.map((value) => ({ value })),
        models: modelsToCreate.map((m) => ({ name: m.name, alias: m.alias })),
      };

      // 创建供应商（先创建平台和密钥，再创建模型并关联）
      if (modelsToCreate.length > 0 && item.data.apiKeys.length > 0) {
        // 需要精确控制模型 - 密钥关联时，分步创建
        const result = await createProviderWithKeyAssociations(
          payload,
          modelsToCreate,
          currentItem.creationState // 传入已有状态，支持断点续传
        );

        // 保存创建状态
        currentItem.creationState = {
          platformId: result.platformId,
          createdKeyIds: result.createdKeyIds,
        };
      } else {
        // 没有模型或没有密钥时，直接创建
        await store.createProvider(payload);
      }

      currentItem.status = "成功";
    } catch (error) {
      currentItem.status = "失败";

      // 记录失败阶段，便于调试和用户理解
      // 只有在 failedAt 未设置时才判断（避免覆盖 fetch_models 等已设置的阶段）
      if (!currentItem.creationState) {
        // 如果没有任何状态，说明在创建平台阶段就失败了
        currentItem.creationState = { failedAt: "platform" };
      } else if (!currentItem.creationState.failedAt) {
        // 如果有状态但 failedAt 未设置，根据已有资源判断失败阶段
        if (!currentItem.creationState.createdKeyIds?.length) {
          // 有平台 ID 但没有密钥 ID，说明在创建密钥阶段失败
          currentItem.creationState.failedAt = "keys";
        } else {
          // 有平台和密钥 ID，说明在创建模型阶段失败
          currentItem.creationState.failedAt = "models";
        }
      }
      // 如果 failedAt 已经设置（如 fetch_models），则保持不变

      currentItem.error = handleApiError(error, "导入失败");
    } finally {
      store.currentProvider = null; // 清理临时状态
    }
  }
  isImporting.value = false;
};

/**
 * 创建带精确密钥关联的供应商（分步创建：平台 → 密钥 → 模型）
 * 支持断点续传：可以传入已有的创建状态，避免重复创建资源
 */
async function createProviderWithKeyAssociations(
  payload: {
    platform: {
      name: string;
      format: string;
      base_url: string;
      rate_limit: { rpm: number; tpm: number };
    };
    apiKeys: Array<{ value: string }>;
    models: Array<{ name: string; alias: string }>;
  },
  modelsWithKeyIndices: Array<{ name: string; alias: string; keyIndices: number[] }>,
  existingState?: {
    platformId?: number;
    createdKeyIds?: number[];
  }
): Promise<{
  platformId: number;
  createdKeyIds: number[];
}> {
  let platformId: number;
  let createdKeys: ApiKey[] = [];

  // 创建或复用平台
  if (existingState?.platformId) {
    platformId = existingState.platformId;
    console.log(`[批量导入] 复用已创建的平台 ID: ${platformId}`);

    // 验证平台是否仍然存在
    try {
      await providerApi.getPlatformById(platformId);
    } catch (error) {
      console.warn(`[批量导入] 平台 ID ${platformId} 不存在，将重新创建`, error);
      existingState.platformId = undefined;
      const createdPlatform = await providerApi.createPlatform(payload.platform);
      platformId = createdPlatform.id;
    }
  } else {
    const createdPlatform = await providerApi.createPlatform(payload.platform);
    platformId = createdPlatform.id;
    console.log(`[批量导入] 创建新平台，ID: ${platformId}`);
  }

  // 创建或复用密钥
  if (existingState?.createdKeyIds && existingState.createdKeyIds.length > 0) {
    console.log(`[批量导入] 发现已创建的密钥：${existingState.createdKeyIds.length} 个`);

    // 获取已创建的密钥信息
    try {
      const existingKeys = await providerApi.getProviderKeys(platformId);
      createdKeys = existingKeys.filter((key) => existingState.createdKeyIds!.includes(key.id!));
      console.log(`[批量导入] 成功复用 ${createdKeys.length} 个已创建的密钥`);
    } catch (error) {
      console.warn(`[批量导入] 获取已有密钥失败，将重新创建`, error);
      createdKeys = [];
    }

    // 如果需要创建的密钥数量 > 已创建数量，创建剩余的密钥
    const remainingKeysCount = payload.apiKeys.length - createdKeys.length;
    if (remainingKeysCount > 0) {
      console.log(`[批量导入] 需要创建剩余的 ${remainingKeysCount} 个密钥`);
      const remainingKeys = payload.apiKeys.slice(createdKeys.length);
      for (const apiKeyData of remainingKeys) {
        const newKey = await providerApi.createProviderKey(platformId, apiKeyData);
        createdKeys.push(newKey);
      }
    }
  } else {
    // 首次创建所有密钥
    console.log(`[批量导入] 创建 ${payload.apiKeys.length} 个新密钥`);
    for (const apiKeyData of payload.apiKeys) {
      const createdKey = await providerApi.createProviderKey(platformId, apiKeyData);
      createdKeys.push(createdKey);
    }
  }

  // 创建模型
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

      // 只返回有关联密钥的模型
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

  // 批量创建所有模型
  if (modelsToCreate.length > 0) {
    await providerApi.createModelsBatch(platformId, modelsToCreate);
    console.log(`[批量导入] 成功创建 ${modelsToCreate.length} 个模型`);
  }

  // 刷新供应商列表
  await store.fetchProviders();

  // 返回创建的资源 ID
  return {
    platformId,
    createdKeyIds: createdKeys.map((k) => k.id!).filter((id) => id !== undefined),
  };
}

const handleStartImport = async () => {
  importList.value = JSON.parse(JSON.stringify(parsedItems.value));
  const validItems = importList.value.filter((item) => item.status === "待处理");
  await processImport(validItems);
  if (!hasFailedItems.value) {
    message.success("所有供应商导入成功！");
    emit("import-success");
  } else {
    message.warning("部分供应商导入失败，请检查。");
  }
};

const handleRetryFailed = async () => {
  const failedItems = importList.value.filter((item) => item.status === "失败");
  await processImport(failedItems);
  if (!hasFailedItems.value) {
    message.success("所有失败条目已成功重试！");
    emit("import-success");
  } else {
    message.error("仍有部分供应商导入失败。");
  }
};

const columns: DataTableColumns<ImportItem> = [
  { title: "行号", key: "line", width: 60 },
  { title: "名称", key: "data.name" },
  { title: "API 类型", key: "data.format", width: 100 },
  {
    title: "密钥数",
    key: "keyCount",
    width: 80,
    render(row) {
      return row.data?.apiKeys?.length ?? 0;
    },
  },
  {
    title: "状态",
    key: "status",
    width: 120,
    render(row) {
      return h(
        NTag,
        { type: getStatusType(row.status), size: "small" },
        {
          default: () => row.status,
        }
      );
    },
  },
  {
    title: "信息",
    key: "error",
    render(row) {
      let errorText = row.error ?? "";

      // 添加失败阶段信息
      if (row.creationState?.failedAt) {
        const stageMap = {
          fetch_models: "获取模型",
          platform: "创建平台",
          keys: "创建密钥",
          models: "创建模型",
        };
        const stageName = stageMap[row.creationState.failedAt];
        errorText = `[${stageName}失败] ${errorText}`;
      }

      // 显示已创建的资源提示（便于用户理解重试行为）
      if (row.status === "失败" && row.creationState?.platformId) {
        errorText += ` (平台已创建，重试将复用)`;
      }

      return h("span", { style: { color: row.error ? "red" : "inherit" } }, errorText);
    },
  },
];

const placeholder = `每行一个供应商，格式：[类型],[名称],[端点],[密钥 1 (可选)],[密钥 2 (可选)]...
支持导入多个密钥，用英文逗号隔开。

例如：
OpenAI,One API,https://api.openai.com,sk-xxxx...,sk-yyyy...
OpenAI,New API,https://api.openai2.com,sk-zzzz...
Gemini,One Gemini,http://localhost:11434`;
</script>

<template>
  <n-space vertical>
    <n-input
      v-model:value="inputText"
      type="textarea"
      :rows="10"
      :placeholder="placeholder"
      :disabled="isImporting"
    />
    <n-space align="center">
      <n-checkbox v-model:checked="autoFetchModels" :disabled="isImporting">
        自动获取模型（需填写密钥）
      </n-checkbox>
      <n-checkbox v-model:checked="autoRenameModels" :disabled="!autoFetchModels || isImporting">
        自动重命名模型
      </n-checkbox>
    </n-space>

    <n-data-table
      v-if="importList.length > 0"
      :columns="columns"
      :data="importList"
      :bordered="false"
      size="small"
      style="max-height: 200px; overflow-y: auto"
    />

    <n-space justify="end">
      <n-button @click="$emit('close')">关闭</n-button>
      <n-button
        v-if="hasFailedItems"
        type="warning"
        :loading="isImporting"
        @click="handleRetryFailed"
      >
        重试失败条目
      </n-button>
      <n-button
        type="primary"
        :loading="isImporting"
        :disabled="parsedItems.length === 0"
        @click="handleStartImport"
      >
        开始批量导入
      </n-button>
    </n-space>
  </n-space>
</template>
