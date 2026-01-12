<script setup lang="ts">
import { computed, ref, h } from "vue";
import { useRouter } from "vue-router";
import { useElementBounding, useWindowSize } from "@vueuse/core";
import { NTag } from "naive-ui";
import type { DataTableColumns } from "naive-ui";
import type { ApiKey } from "@/types/provider";
import { useProviderStore } from "@/stores/providerStore";
import { useRenameRulesStore } from "@/stores/renameRulesStore";
import { providerApi } from "@/services/providerApi";
import { handleApiError } from "@/utils/errorHandler";
import { applyRulesToName } from "@/utils/rename";

definePage({
  meta: {
    title: "批量导入供应商",
  },
});

// 定义导入条目的状态
type ImportStatus = "待处理" | "导入中" | "成功" | "失败";

// 每个密钥的独立状态
interface KeyFetchResult {
  keyIndex: number; // 密钥在原始数组中的索引
  keyValue: string; // 密钥值（用于显示）
  status: "pending" | "fetching" | "success" | "failed";
  modelCount?: number; // 成功时获取到的模型数
  error?: string; // 失败时的错误信息
  models?: string[]; // 该密钥获取到的模型名称列表
}

// 定义导入条目接口
interface ImportItem {
  id: number;
  line: number;
  rawData: string;
  status: ImportStatus;
  error?: string;
  data?: {
    provider: string;
    name: string;
    base_url: string;
    apiKeys: string[]; // 支持多个密钥
  };
  // 新增：密钥级别的获取结果
  keyResults?: KeyFetchResult[];
  // 新增：创建阶段的错误（用于在成功密钥行显示）
  createError?: string;
}

// 扁平化的密钥结果数据（用于表格展示）
interface FlatImportResult {
  key: string; // 唯一标识
  provider: string; // API 类型
  name: string; // 供应商名称
  base_url: string; // API 端点
  apiKey: string; // 密钥值
  status: ImportStatus;
  message?: string; // 信息栏内容（模型数、错误信息等）
  keyIndex?: number; // 密钥索引（用于关联）
}

const router = useRouter();
const store = useProviderStore();
const renameRulesStore = useRenameRulesStore();
const message = useMessage();

// 当前步骤
type Step = "input" | "progress" | "result";
const STEP_NUMBER_MAP: Record<Step, number> = {
  input: 1,
  progress: 2,
  result: 3,
};
const currentStep = ref<Step>("input");

const stepNumber = computed(() => STEP_NUMBER_MAP[currentStep.value]);

// 输入数据
const inputText = ref("");
const autoFetchModels = ref(true);
const autoRenameModels = ref(true);
const importList = ref<ImportItem[]>([]);
const isImporting = ref(false);

const getItemKeyCount = (item: ImportItem) => item.data?.apiKeys?.length || 1;

const parseInputText = (text: string): ImportItem[] => {
  const trimmed = text.trim();
  if (!trimmed) return [];

  return trimmed.split("\n").map((line, index) => {
    const parts = line.split(",").map((s) => s.trim());
    const [provider, name, base_url, ...apiKeys] = parts;
    const item: ImportItem = {
      id: index,
      line: index + 1,
      rawData: line,
      status: "待处理",
    };

    if (!provider || !name || !base_url) {
      item.status = "失败";
      item.error = "格式错误：缺少 API 类型、名称或 API 端点";
      return item;
    }

    const validApiKeys = apiKeys.filter((key) => key && key.length > 0);
    item.data = { provider, name, base_url, apiKeys: validApiKeys };
    return item;
  });
};

const cloneImportItems = (items: ImportItem[]): ImportItem[] => {
  return items.map((item) => ({
    ...item,
    data: item.data
      ? {
          ...item.data,
          apiKeys: [...item.data.apiKeys],
        }
      : undefined,
    keyResults: item.keyResults ? item.keyResults.map((result) => ({ ...result })) : undefined,
  }));
};

const buildFlatResults = (items: ImportItem[]): FlatImportResult[] => {
  const results: FlatImportResult[] = [];

  for (const item of items) {
    if (!item.data) {
      results.push({
        key: `${item.id}-error`,
        provider: "",
        name: "",
        base_url: "",
        apiKey: "",
        status: item.status,
        message: item.error,
      });
      continue;
    }

    if (item.data.apiKeys.length === 0) {
      results.push({
        key: `${item.id}-0`,
        provider: item.data.provider,
        name: item.data.name,
        base_url: item.data.base_url,
        apiKey: "无密钥",
        status: item.status,
        message: item.status === "成功" ? "导入成功" : item.error,
      });
      continue;
    }

    const keyResultMap = item.keyResults
      ? new Map(item.keyResults.map((result) => [result.keyIndex, result]))
      : null;

    item.data.apiKeys.forEach((apiKey, index) => {
      const keyResult = keyResultMap?.get(index);
      let message = "";
      let rowStatus = item.status;

      if (keyResult) {
        if (keyResult.status === "success") {
          if (item.status === "成功") {
            message = `获取 ${keyResult.modelCount} 个模型`;
          } else if (item.createError) {
            message = item.createError;
          }
        } else if (keyResult.status === "failed") {
          message = keyResult.error || "获取模型失败";
          if (item.status === "成功") {
            rowStatus = "失败";
          }
        } else if (keyResult.status === "fetching") {
          message = "获取中...";
        }
      } else {
        message = item.status === "成功" ? "导入成功" : item.error || "";
      }

      results.push({
        key: `${item.id}-${index}`,
        provider: item.data!.provider,
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

// 解析输入文本
const parsedItems = computed(() => parseInputText(inputText.value));
const previewResults = computed(() => buildFlatResults(parsedItems.value));

// 计算总密钥数（用于进度条）
const totalKeys = computed(() => {
  return importList.value.reduce((sum, item) => sum + getItemKeyCount(item), 0);
});

// 计算已完成密钥数
const completedKeys = computed(() => {
  return importList.value.reduce((sum, item) => {
    if (item.status === "成功" || item.status === "失败") {
      return sum + getItemKeyCount(item);
    }
    return sum;
  }, 0);
});

// 进度百分比
const keyProgress = computed(() => {
  if (totalKeys.value === 0) return 0;
  return Math.round((completedKeys.value / totalKeys.value) * 100);
});

// 获取当前正在处理的条目
const currentProcessingItem = computed(() => {
  return importList.value.find((item) => item.status === "导入中");
});

// 扁平化结果数据（按密钥展示）
const flatResults = computed<FlatImportResult[]>(() => buildFlatResults(importList.value));

// 是否有失败项
const hasFailedItems = computed(() => importList.value.some((item) => item.status === "失败"));

// 容器引用和自适应高度计算
const scrollbarWrapperRef = ref<HTMLElement | null>(null);
const { top } = useElementBounding(scrollbarWrapperRef);
const { height: windowHeight } = useWindowSize();

// 动态计算滚动区域高度
const scrollbarMaxHeight = computed(() => {
  const bottomMargin = 185;
  const available = windowHeight.value - top.value - bottomMargin;
  return Math.max(200, available);
});

// 获取状态标签类型
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

// 表格列定义
const resultColumns: DataTableColumns<FlatImportResult> = [
  {
    title: "类型",
    key: "provider",
    width: 100,
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: "名称",
    key: "name",
    width: 150,
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: "地址",
    key: "base_url",
    width: 250,
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: "密钥",
    key: "apiKey",
    width: 150,
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: "状态",
    key: "status",
    width: 100,
    align: "center",
    filter(value, row) {
      return row.status === value;
    },
    filterOptions: [
      { label: "成功", value: "成功" },
      { label: "失败", value: "失败" },
    ],
    render: (row) => {
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
    key: "message",
    ellipsis: {
      tooltip: true,
    },
    render: (row) => {
      return row.message || "";
    },
  },
];

// 行样式
const getRowClassName = (row: FlatImportResult) => {
  if (row.status === "失败") {
    return "error-row";
  }
  return "";
};

// 处理导入逻辑
const processImport = async (itemsToProcess: ImportItem[]) => {
  isImporting.value = true;
  for (const item of itemsToProcess) {
    if (!item.data) continue;

    const currentItem = importList.value.find((i) => i.id === item.id);
    if (!currentItem) continue;

    currentItem.status = "导入中";
    currentItem.error = undefined;
    currentItem.createError = undefined;
    currentItem.keyResults = [];

    try {
      let modelsToCreate: Array<{ name: string; alias: string; keyIndices: number[] }> = [];
      const successKeyIndices: number[] = [];

      // 1. 如果启用了自动获取模型且有密钥
      if (autoFetchModels.value && item.data.apiKeys.length > 0) {
        const modelKeyMap = new Map<string, Set<number>>();

        // 为每个密钥独立获取模型
        for (let keyIndex = 0; keyIndex < item.data.apiKeys.length; keyIndex++) {
          const apiKey = item.data.apiKeys[keyIndex];
          const keyResult: KeyFetchResult = {
            keyIndex,
            keyValue: apiKey,
            status: "fetching",
          };
          currentItem.keyResults!.push(keyResult);

          // 设置临时 provider 用于获取模型
          store.currentProvider = {
            platform: {
              name: item.data.name,
              provider: item.data.provider,
              base_url: item.data.base_url,
              rate_limit: { rpm: 0, tpm: 0 },
            },
            apiKeys: [{ value: apiKey }],
            models: [],
          };

          try {
            const fetchedModels = await store.fetchModelsFromProviderOnly();

            // 记录成功
            keyResult.status = "success";
            keyResult.modelCount = fetchedModels.length;
            keyResult.models = fetchedModels.map((m) => m.name);
            successKeyIndices.push(keyIndex);

            // 记录模型与密钥的关联
            fetchedModels.forEach((model) => {
              if (!modelKeyMap.has(model.name)) {
                modelKeyMap.set(model.name, new Set());
              }
              modelKeyMap.get(model.name)!.add(keyIndex);
            });
          } catch (error) {
            // 记录失败
            keyResult.status = "failed";
            keyResult.error = handleApiError(error, "获取模型");
          }
        }

        // 检查是否所有密钥都失败
        if (successKeyIndices.length === 0) {
          currentItem.status = "失败";
          currentItem.error = "所有密钥获取模型均失败";
          continue; // 跳过创建
        }

        // 构建模型列表（只关联成功的密钥）
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
          const { rules } = renameRulesStore;

          modelsToCreate = modelsWithKeyIndices.map((model) => {
            const newName = applyRulesToName(model.name, rules, (error, rule) => {
              console.warn("应用重命名规则失败：", { error, rule });
            });
            const alias = newName !== model.name ? newName : "";
            return { name: model.name, alias, keyIndices: model.keyIndices };
          });
        } else {
          modelsToCreate = modelsWithKeyIndices;
        }
      }

      // 3. 创建平台（只使用成功的密钥）
      const keysToCreate =
        successKeyIndices.length > 0
          ? successKeyIndices.map((i) => item.data!.apiKeys[i])
          : item.data.apiKeys;

      const payload = {
        platform: {
          name: item.data.name,
          provider: item.data.provider,
          base_url: item.data.base_url,
          rate_limit: { rpm: 0, tpm: 0 },
        },
        apiKeys: keysToCreate.map((value) => ({ value })),
        models: modelsToCreate.map((m) => ({ name: m.name, alias: m.alias })),
      };

      await createProviderWithKeyAssociations(payload, modelsToCreate);

      currentItem.status = "成功";
    } catch (error) {
      currentItem.status = "失败";
      currentItem.createError = handleApiError(error, "创建失败");
    } finally {
      store.currentProvider = null;
    }
  }
  isImporting.value = false;
};

/**
 * 创建带精确密钥关联的供应商（分步创建：平台 → 密钥 → 模型）
 */
async function createProviderWithKeyAssociations(
  payload: {
    platform: {
      name: string;
      provider: string;
      base_url: string;
      rate_limit: { rpm: number; tpm: number };
    };
    apiKeys: Array<{ value: string }>;
    models: Array<{ name: string; alias: string }>;
  },
  modelsWithKeyIndices: Array<{ name: string; alias: string; keyIndices: number[] }>
): Promise<void> {
  // 创建平台
  const createdPlatform = await providerApi.createPlatform(payload.platform);
  const platformId = createdPlatform.id;
  console.log(`[批量导入] 创建新平台，ID: ${platformId}`);

  // 创建所有密钥
  const createdKeys: ApiKey[] = [];
  console.log(`[批量导入] 创建 ${payload.apiKeys.length} 个新密钥`);
  for (const apiKeyData of payload.apiKeys) {
    const createdKey = await providerApi.createProviderKey(platformId, apiKeyData);
    createdKeys.push(createdKey);
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
  await store.loadProviders();
}

// 返回列表页
const handleBack = () => {
  router.push("/provider");
};

// 取消并返回
const handleCancel = () => {
  handleBack();
};

// 开始导入
const handleStartImport = async () => {
  importList.value = cloneImportItems(parsedItems.value);
  const validItems = importList.value.filter((item) => item.status === "待处理");

  if (validItems.length === 0) {
    message.warning("没有有效的导入条目");
    return;
  }

  currentStep.value = "progress";
  await processImport(validItems);
  currentStep.value = "result";

  if (!hasFailedItems.value) {
    message.success("所有供应商导入成功！");
  } else {
    message.warning("部分供应商导入失败，请检查。");
  }
};

// 完成并返回
const handleComplete = () => {
  handleBack();
};

const placeholder = `每行一个供应商，格式：[类型],[名称],[端点],[密钥 1 (可选)],[密钥 2 (可选)]...
支持导入多个密钥，用英文逗号隔开。

例如：
OpenAI,One API,https://api.openai.com,sk-xxxx...,sk-yyyy...
OpenAI,New API,https://api.openai2.com,sk-zzzz...
Gemini,One Gemini,http://localhost:11434
Anthropic,Claude API,https://api.anthropic.com,sk-ant-xxxx...`;
</script>

<style scoped>
.error-row {
  background-color: rgba(208, 48, 80, 0.1);
}
</style>

<template>
  <!-- 步骤导航 -->
  <n-steps :current="stepNumber" style="margin-bottom: 24px">
    <n-step title="输入数据" description="填写导入信息" />
    <n-step title="导入进度" description="正在导入供应商" />
    <n-step title="导入结果" description="查看导入结果" />
  </n-steps>

  <!-- 步骤 1：输入数据 -->
  <div v-if="currentStep === 'input'">
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

      <!-- 预览解析结果 -->
      <div v-if="parsedItems.length > 0" ref="scrollbarWrapperRef">
        <n-divider />
        <div style="margin-bottom: 12px">
          <n-text strong>预览解析结果（共 {{ parsedItems.length }} 条）</n-text>
        </div>
        <n-scrollbar :style="{ maxHeight: `${scrollbarMaxHeight}px` }">
          <n-data-table
            :columns="resultColumns"
            :data="previewResults"
            :bordered="false"
            :row-class-name="getRowClassName"
            size="small"
            :pagination="false"
          />
        </n-scrollbar>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px">
        <n-button @click="handleCancel">取消</n-button>
        <n-button
          type="primary"
          :loading="isImporting"
          :disabled="parsedItems.length === 0"
          @click="handleStartImport"
        >
          开始批量导入
        </n-button>
      </div>
    </n-space>
  </div>

  <!-- 步骤 2：导入进度 -->
  <div v-if="currentStep === 'progress'">
    <n-space vertical :size="16">
      <!-- 进度条 -->
      <n-card size="small" :bordered="false">
        <n-space vertical :size="8">
          <div style="display: flex; justify-content: space-between; align-items: center">
            <n-text>导入进度</n-text>
            <n-text strong>{{ completedKeys }} / {{ totalKeys }}</n-text>
          </div>
          <n-progress
            type="line"
            :percentage="keyProgress"
            :status="keyProgress === 100 ? 'success' : 'default'"
            :show-indicator="false"
            processing
          />
          <div v-if="currentProcessingItem" style="margin-top: 8px">
            <n-text depth="2"> 当前：{{ currentProcessingItem.data?.name || "处理中..." }} </n-text>
          </div>
        </n-space>
      </n-card>

      <!-- 结果表格 -->
      <n-data-table
        :columns="resultColumns"
        :data="flatResults"
        :max-height="scrollbarMaxHeight - 117 - 78"
        :bordered="false"
        :row-class-name="getRowClassName"
        :pagination="false"
      />
    </n-space>
  </div>

  <!-- 步骤 3：导入结果 -->
  <div v-if="currentStep === 'result'">
    <n-data-table
      :columns="resultColumns"
      :data="flatResults"
      :max-height="scrollbarMaxHeight - 78 - 24"
      :bordered="false"
      :row-class-name="getRowClassName"
      :pagination="false"
    />

    <div style="display: flex; justify-content: flex-end; margin-top: 24px">
      <n-button type="primary" @click="handleComplete">完成</n-button>
    </div>
  </div>
</template>
