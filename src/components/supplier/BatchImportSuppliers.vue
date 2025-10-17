<script setup lang="ts">
import { ref, computed } from "vue";
import { NInput, NCheckbox, NButton, NSpace, NDataTable, NTag, NSpin, useMessage } from "naive-ui";
import type { DataTableColumns } from "naive-ui";
import { useSupplierStore } from "@/stores/providerStore";
import { useRenameRulesStore } from "@/stores/renameRulesStore";
import { handleApiError } from "@/utils/errorHandler";

// 定义导入条目的状态
type ImportStatus = "pending" | "importing" | "success" | "failed";

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
    apiKey?: string;
  };
}

const emit = defineEmits<{
  (e: "close"): void;
  (e: "import-success"): void;
}>();

const store = useSupplierStore();
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
    const [format, name, base_url, apiKey] = line.split(",").map((s) => s.trim());
    const item: ImportItem = {
      id: index,
      line: index + 1,
      rawData: line,
      status: "pending",
    };
    if (!format || !name || !base_url) {
      item.status = "failed";
      item.error = "格式错误：缺少 API 类型、名称或 API 端点";
    } else {
      item.data = { format, name, base_url, apiKey: apiKey ?? "" };
    }
    return item;
  });
});

const hasFailedItems = computed(() => importList.value.some((item) => item.status === "failed"));

const getStatusType = (status: ImportStatus) => {
  switch (status) {
    case "success":
      return "success";
    case "failed":
      return "error";
    case "importing":
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

    currentItem.status = "importing";
    currentItem.error = undefined;

    try {
      let modelsToCreate: { name: string; alias: string }[] = [];

      // 1. 如果启用了自动获取模型且有密钥，则先获取模型
      if (autoFetchModels.value && item.data.apiKey) {
        // 为了获取模型，需要临时设置 currentSupplier
        store.currentSupplier = {
          platform: {
            name: item.data.name,
            format: item.data.format,
            base_url: item.data.base_url,
            rate_limit: { rpm: 0, tpm: 0 },
          },
          apiKey: { value: item.data.apiKey },
          models: [],
        };

        const fetchedModels = await store.fetchModelsFromProviderOnly();

        // 2. 如果启用了自动重命名，则处理模型别名
        if (autoRenameModels.value && fetchedModels.length > 0) {
          const renameRulesStore = useRenameRulesStore();
          const { rules } = renameRulesStore;

          fetchedModels.forEach((model) => {
            let newAlias = model.name;
            rules.forEach((rule) => {
              if (!rule.enabled) return;
              try {
                switch (rule.type) {
                  case "insert":
                    if (rule.position === "prefix") newAlias = rule.value + newAlias;
                    else if (rule.position === "suffix") newAlias += rule.value;
                    else if (rule.position === "after" && rule.match)
                      newAlias = newAlias.replace(
                        new RegExp(rule.match, "g"),
                        rule.match + rule.value
                      );
                    else if (rule.position === "before" && rule.match)
                      newAlias = newAlias.replace(
                        new RegExp(rule.match, "g"),
                        rule.value + rule.match
                      );
                    break;
                  case "replace":
                    if (rule.from) newAlias = newAlias.replace(new RegExp(rule.from, "g"), rule.to);
                    break;
                  case "regex":
                    if (rule.pattern)
                      newAlias = newAlias.replace(new RegExp(rule.pattern, "g"), rule.replace);
                    break;
                  case "case":
                    if (rule.mode === "upper") newAlias = newAlias.toUpperCase();
                    else if (rule.mode === "lower") newAlias = newAlias.toLowerCase();
                    break;
                }
              } catch (e) {
                console.warn("应用重命名规则失败：", e);
              }
            });
            model.alias = newAlias;
          });
        }

        modelsToCreate = fetchedModels.map((m) => ({ name: m.name, alias: m.alias }));
      }

      // 3. 构造最终的 payload 并一次性创建
      const payload = {
        platform: {
          name: item.data.name,
          format: item.data.format,
          base_url: item.data.base_url,
          rate_limit: { rpm: 0, tpm: 0 },
        },
        apiKey: { value: item.data.apiKey ?? "" },
        models: modelsToCreate,
      };

      await store.createSupplier(payload);
      currentItem.status = "success";
    } catch (error) {
      currentItem.status = "failed";
      currentItem.error = handleApiError(error, "导入失败");
    } finally {
      store.currentSupplier = null; // 清理临时状态
    }
  }
  isImporting.value = false;
};

const handleStartImport = async () => {
  importList.value = JSON.parse(JSON.stringify(parsedItems.value));
  const validItems = importList.value.filter((item) => item.status === "pending");
  await processImport(validItems);
  if (!hasFailedItems.value) {
    message.success("所有供应商导入成功！");
    emit("import-success");
  } else {
    message.warning("部分供应商导入失败，请检查。");
  }
};

const handleRetryFailed = async () => {
  const failedItems = importList.value.filter((item) => item.status === "failed");
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
    title: "状态",
    key: "status",
    width: 120,
    render(row) {
      return h(
        NTag,
        { type: getStatusType(row.status), size: "small" },
        {
          default: () => row.status,
          icon: () => (row.status === "importing" ? h(NSpin, { size: "small" }) : null),
        }
      );
    },
  },
  {
    title: "信息",
    key: "error",
    render(row) {
      return h("span", { style: { color: row.error ? "red" : "inherit" } }, row.error ?? "");
    },
  },
];
</script>

<template>
  <n-space vertical>
    <n-input
      v-model:value="inputText"
      type="textarea"
      :rows="10"
      placeholder="每行一个供应商，格式：API 类型,名称,API 端点,API 密钥（可选）&#10;例如：&#10;OpenAI,My GPT-4,https://api.openai.com/v1,sk-xxxx...&#10;Gemini,My Gemini Pro,https://generativelanguage.googleapis.com,AIzaSy..."
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
      style="max-height: 300px; overflow-y: auto"
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
