<script setup lang="ts">
import { HealthStatus, type ApiKey } from "@/types/provider";
import type { DataTableColumns } from "naive-ui";
import type { InputInst } from "naive-ui";
import type { PropType } from "vue";
import { NButton, NInput, NSpace, NTag } from "naive-ui";
import { generateUUID } from "@/utils/uuid";
import { computed, defineComponent, h, nextTick, ref } from "vue";
import { useElementBounding, useWindowSize } from "@vueuse/core";

interface Props {
  apiKeys: (Pick<ApiKey, "value"> & {
    id?: number | null;
    isDirty?: boolean;
    tempId?: string;
    health_status?: HealthStatus;
  })[];
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
  enableHealth: [id: number];
  disableHealth: [id: number];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 容器引用和自适应高度计算
const containerRef = ref<HTMLElement | null>(null);
const { top } = useElementBounding(containerRef);
const { height: windowHeight } = useWindowSize();

// 计算表格最大高度
const tableMaxHeight = computed(() => {
  // 表格上方元素的高度
  const headerOffset = 42;
  // 预留底部边距
  const bottomMargin = 80;
  // 计算可用高度
  const available = windowHeight.value - top.value - headerOffset - bottomMargin;
  // 设置最小高度 100px
  return Math.max(100, available);
});

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
    width: 200,
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
  <div ref="containerRef">
    <n-data-table
      :columns="columns"
      :data="apiKeys"
      :bordered="true"
      size="small"
      :summary="summary"
      :max-height="tableMaxHeight"
    >
      <template #empty>
        <n-empty description="无数据">
          <template #extra>
            <n-button type="primary" @click="handleAddApiKey">添加密钥</n-button>
          </template>
        </n-empty>
      </template>
    </n-data-table>
  </div>
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
