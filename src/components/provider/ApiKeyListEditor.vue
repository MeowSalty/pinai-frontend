<script setup lang="ts">
import { HealthStatus, type ApiKey } from "@/types/provider";
import type { DataTableColumns } from "naive-ui";
import type { InputInst } from "naive-ui";
import type { PropType } from "vue";
import { NButton, NInput, NSpace, NTag } from "naive-ui";
import { generateUUID } from "@/utils/uuid";
import { computed, defineComponent, h, nextTick, ref } from "vue";

interface Props {
  apiKeys: (Pick<ApiKey, "value"> & {
    id?: number | null;
    isDirty?: boolean;
    tempId?: string;
    health_status?: HealthStatus;
  })[];
  platformFormat?: string;
  baseUrl?: string;
  isFetchingModels?: boolean;
}

interface Emits {
  update: [
    apiKeys: (Pick<ApiKey, "value"> & {
      id?: number | null;
      isDirty?: boolean;
      tempId?: string;
      health_status?: HealthStatus;
    })[]
  ];
  add: [];
  remove: [index: number];
  fetchModelsByKey: [keyInfo: { id: number; tempId?: string; value: string }, keyIndex: number];
  importFromClipboard: [modelNames: string[], keyId: number, keyIndex: number];
  enableHealth: [id: number];
  disableHealth: [id: number];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const message = useMessage();

// 本地加载状态：追踪正在加载的密钥索引
const loadingKeys = ref<Set<number>>(new Set());

// ShowOrEdit 组件：点击切换显示/编辑模式
interface OnUpdateValue {
  (value: string): void;
}

const ShowOrEdit = defineComponent({
  props: {
    value: {
      type: String,
      default: "",
    },
    displayValue: {
      type: String,
      default: "",
    },
    onUpdateValue: {
      type: Function as PropType<OnUpdateValue>,
      required: true,
    },
  },
  setup(props) {
    const isEdit = ref(false);
    const inputRef = ref<InputInst | null>(null);
    const inputValue = ref(props.value);

    function handleOnClick() {
      isEdit.value = true;
      // 进入编辑模式时，使用完整值
      inputValue.value = props.value;
      nextTick(() => {
        inputRef.value?.focus();
      });
    }

    function handleChange() {
      // 只有当值真正改变时才触发更新
      if (inputValue.value !== props.value) {
        props.onUpdateValue?.(String(inputValue.value));
      }
      isEdit.value = false;
    }

    return () =>
      h(
        "div",
        {
          style: "min-height: 22px; cursor: pointer; display: flex; align-items: center; gap: 8px;",
          onClick: handleOnClick,
        },
        isEdit.value
          ? h(NInput, {
              ref: inputRef,
              value: String(inputValue.value),
              type: "textarea",
              autosize: {
                minRows: 1,
                maxRows: 5,
              },
              onUpdateValue: (v: string) => {
                inputValue.value = v;
              },
              onChange: handleChange,
              onBlur: handleChange,
              onKeyup: (e: KeyboardEvent) => {
                if (e.key === "Enter") {
                  handleChange();
                }
              },
            })
          : [
              h("span", {}, props.displayValue || "(请输入密钥)"),
              h(NButton, {
                text: true,
                size: "small",
                onClick: (e: Event) => {
                  e.stopPropagation();
                  handleOnClick();
                },
              }),
            ]
      );
  },
});

// 检查特定密钥是否正在加载
const isKeyLoading = (index: number) => {
  return loadingKeys.value.has(index);
};

// 检查是否有任何密钥正在加载
const hasAnyKeyLoading = computed(() => {
  return loadingKeys.value.size > 0;
});

// 监听全局加载状态变化，用于清除本地加载状态
watch(
  () => props.isFetchingModels,
  (newVal, oldVal) => {
    // 当全局加载状态从 true 变为 false 时，清除所有本地加载状态
    if (oldVal && !newVal) {
      loadingKeys.value.clear();
    }
  }
);

const isFetchDisabled = (
  apiKey: Pick<ApiKey, "value"> & {
    id?: number | null;
    isDirty?: boolean;
    tempId?: string;
    health_status?: HealthStatus;
  }
) => {
  return !props.platformFormat || !props.baseUrl || !apiKey.value || hasAnyKeyLoading.value;
};

const handleFetchModels = (index: number) => {
  const apiKey = props.apiKeys[index];
  // 支持使用 id 或 tempId 进行识别
  const keyIdentifier = apiKey.id || apiKey.tempId;
  if (keyIdentifier && apiKey.value && !isFetchDisabled(apiKey)) {
    // 添加到加载集合
    loadingKeys.value.add(index);

    emit(
      "fetchModelsByKey",
      {
        id: apiKey.id || 0,
        tempId: apiKey.tempId,
        value: apiKey.value,
      },
      index
    );
  }
};

const importFromClipboard = async (index: number) => {
  const apiKey = props.apiKeys[index];
  // 支持使用 id 或 tempId 进行识别
  const keyIdentifier = apiKey.id || apiKey.tempId;
  if (!keyIdentifier) {
    message.warning("请先添加密钥后再导入模型");
    return;
  }

  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) {
      message.warning("剪切板内容为空");
      return;
    }

    const modelNames = text
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (modelNames.length === 0) {
      message.warning("未找到有效的模型名称");
      return;
    }

    emit("importFromClipboard", modelNames, apiKey.id || 0, index);
    message.success(`成功读取 ${modelNames.length} 个模型`);
  } catch (error) {
    message.error("读取剪切板失败，请检查浏览器权限");
    console.error("Clipboard read error:", error);
  }
};

const updateApiKey = (index: number, value: string) => {
  const updatedApiKeys = [...props.apiKeys];
  updatedApiKeys[index] = {
    ...updatedApiKeys[index],
    value,
    isDirty: true,
  };
  emit("update", updatedApiKeys);
};

const handleAddApiKey = () => {
  const newApiKeys = [
    ...props.apiKeys,
    {
      value: "",
      id: null,
      isDirty: true,
      tempId: generateUUID(), // 生成临时 UUID
    },
  ];
  emit("update", newApiKeys);
};

const handleRemoveApiKey = (index: number) => {
  // 触发 remove 事件，由父组件处理删除逻辑
  // 父组件会根据密钥类型（已保存/未保存）决定是否弹出确认对话框
  emit("remove", index);
};

// 定义数据表格列
const columns = computed<DataTableColumns<(typeof props.apiKeys)[0]>>(() => [
  {
    title: "ID",
    key: "id",
    width: 80,
    render(row) {
      if (row.id && row.id > 0) {
        return h("span", {}, row.id.toString());
      }
      return h(
        NTag,
        {
          type: "info",
          size: "small",
        },
        { default: () => "新" }
      );
    },
  },
  {
    title: "密钥",
    key: "value",
    ellipsis: {
      tooltip: false,
    },
    render(row, index) {
      return h(ShowOrEdit, {
        value: row.value,
        displayValue: row.value,
        onUpdateValue: (v: string) => {
          updateApiKey(index, v);
        },
      });
    },
  },
  {
    title: "状态",
    key: "status",
    width: 120,
    filterOptions: [
      { label: "未知", value: HealthStatus.Unknown },
      { label: "可用", value: HealthStatus.Available },
      { label: "警告", value: HealthStatus.Warning },
      { label: "禁用", value: HealthStatus.Unavailable },
    ],
    filterMultiple: true,
    filter(values, row) {
      const status = row.health_status ?? HealthStatus.Unknown;
      return Boolean(status === values);
    },

    render(row) {
      const tags: ReturnType<typeof h>[] = [];

      // 健康状态标签
      if (row.health_status !== undefined) {
        const statusMap = {
          [HealthStatus.Unknown]: { text: "未知", type: "default" as const },
          [HealthStatus.Available]: { text: "可用", type: "success" as const },
          [HealthStatus.Warning]: { text: "警告", type: "warning" as const },
          [HealthStatus.Unavailable]: { text: "禁用", type: "error" as const },
        };
        const status = row.health_status ?? HealthStatus.Unknown;
        const config = statusMap[status];
        tags.push(h(NTag, { type: config.type, size: "small" }, { default: () => config.text }));
      }

      // 修改状态标签
      if (row.isDirty) {
        tags.push(
          h(
            NTag,
            {
              type: "warning",
              size: "small",
            },
            { default: () => "已修改" }
          )
        );
      }

      if (tags.length === 0) {
        return h("span", {}, "-");
      }

      return h(NSpace, { size: "small" }, { default: () => tags });
    },
  },
  {
    title: "操作",
    key: "actions",
    width: 320,
    render(row, index) {
      const status = row.health_status ?? HealthStatus.Unknown;
      const isUnavailable = status === HealthStatus.Unavailable;
      const isUnknown = status === HealthStatus.Unknown;

      // 启用/重置按钮文本
      const enableButtonText = isUnavailable ? "启用" : "重置";

      return h(
        NSpace,
        { size: "small" },
        {
          default: () => [
            h(
              NButton,
              {
                quaternary: true,
                size: "small",
                onClick: () => handleFetchModels(index),
                disabled: isFetchDisabled(row),
                loading: isKeyLoading(index),
              },
              { default: () => "获取" }
            ),
            h(
              NButton,
              {
                quaternary: true,
                size: "small",
                onClick: () => importFromClipboard(index),
                disabled: !row.id && !row.tempId,
                title: "从剪切板导入模型（逗号分隔）",
              },
              {
                default: () => "导入",
              }
            ),
            h(
              NButton,
              {
                quaternary: true,
                size: "small",
                type: "success",
                disabled: isUnknown || !row.id,
                onClick: () => emit("enableHealth", row.id!),
              },
              { default: () => enableButtonText }
            ),
            h(
              NButton,
              {
                quaternary: true,
                size: "small",
                type: "error",
                disabled: isUnavailable || !row.id,
                onClick: () => emit("disableHealth", row.id!),
              },
              { default: () => "禁用" }
            ),
            h(
              NButton,
              {
                size: "small",
                type: "error",
                onClick: () => handleRemoveApiKey(index),
              },
              { default: () => "删除" }
            ),
          ],
        }
      );
    },
  },
]);

// 总结栏配置
const summary = () => {
  return {
    id: {
      value: h(
        NButton,
        {
          type: "primary",
          ghost: true,
          onClick: handleAddApiKey,
        },
        { default: () => "添加密钥" }
      ),
      colSpan: 4,
    },
  };
};
</script>

<template>
  <n-data-table :columns="columns" :data="apiKeys" :bordered="true" size="small" :summary="summary">
    <template #empty>
      <n-empty description="无数据">
        <template #extra>
          <n-button type="primary" @click="handleAddApiKey">添加密钥</n-button>
        </template>
      </n-empty>
    </template>
  </n-data-table>
</template>

<style scoped>
.api-key-list {
  margin-top: 16px;
}

.api-keys-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.add-key-btn {
  align-self: flex-start;
}

.no-api-keys {
  padding: 24px 0;
}
</style>
