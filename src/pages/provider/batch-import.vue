<script setup lang="ts">
import { computed, ref, h } from "vue";
import { useRouter } from "vue-router";
import { useElementBounding, useWindowSize } from "@vueuse/core";
import { NTag } from "naive-ui";
import type { DataTableColumns } from "naive-ui";
import { useProviderStore } from "@/stores/providerStore";
import { useRenameRulesStore } from "@/stores/renameRulesStore";
import { parseInputText } from "@/composables/providerBatchImport/parser";
import { buildFlatResults, getItemKeyCount } from "@/composables/providerBatchImport/results";
import { cloneImportItems } from "@/composables/providerBatchImport/helpers";
import { processImportItems } from "@/composables/providerBatchImport/workflow";
import type {
  FlatImportResult,
  ImportItem,
  ImportStatus,
} from "@/composables/providerBatchImport/types";

definePage({
  meta: {
    title: "批量导入供应商",
  },
});

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
    title: "变体",
    key: "variant",
    width: 140,
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
        },
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
  await processImportItems(itemsToProcess, importList.value, store, renameRulesStore, {
    autoFetchModels: autoFetchModels.value,
    autoRenameModels: autoRenameModels.value,
  });
  isImporting.value = false;
};

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

const placeholder = `每行一个供应商，格式：[类型 [变体]],[名称],[端点],[密钥 1 (可选)],[密钥 2 (可选)]...
变体可省略（OpenAI→chat_completions，Anthropic→messages，Gemini→generate，NewAPI/OneAPI→chat_completions）。
支持导入多个密钥，用英文逗号隔开。

例如：
OpenAI[chat_completions],One API,https://api.openai.com,sk-xxxx...,sk-yyyy...
OpenAI[responses],New API,https://api.openai2.com,sk-zzzz...
OpenAI,Default API,https://api.openai.com,sk-aaaa...
Gemini,One Gemini,http://localhost:11434
Anthropic,Claude API,https://api.anthropic.com,sk-ant-xxxx...
NewAPI,聚合服务,https://api.example.com,sk-xxxx...
OneAPI,聚合服务,https://api.example.com,sk-xxxx...`;
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
