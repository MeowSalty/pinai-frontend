<script setup lang="ts">
import { type Model, type ApiKey, HealthStatus } from "@/types/provider";
import { HealthStatus as HealthStatusEnum } from "@/types/provider";
import type { DataTableColumns } from "naive-ui";
import type { InputInst } from "naive-ui";
import type { PropType } from "vue";
import { Clipboard } from "@vicons/ionicons5";
import { NButton, NInput, NSpace, NTag } from "naive-ui";
import { computed, defineComponent, h, nextTick, ref } from "vue";

interface Props {
  models: (Model & { health_status?: HealthStatus })[];
  apiKeyValue: string;
  baseUrl: string;
  format: string;
  availableKeys: (Pick<ApiKey, "value"> & { id?: number | null; tempId?: string })[];
}

interface Emits {
  "update:models": [models: (Model & { health_status?: HealthStatus })[]];
  addModel: [selectedKeyFilter: string | null];
  removeModel: [index: number, keyIdentifier: string | null];
  openRenameModal: [];
  importFromClipboard: [modelNames: string[], selectedKeyFilter: string | null];
  enableHealth: [id: number];
  disableHealth: [id: number];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const message = useMessage();

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
    placeholder: {
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
      inputValue.value = props.value;
      nextTick(() => {
        inputRef.value?.focus();
      });
    }

    function handleChange() {
      if (inputValue.value !== props.value) {
        props.onUpdateValue?.(String(inputValue.value));
      }
      isEdit.value = false;
    }

    return () =>
      h(
        "div",
        {
          style: "min-height: 22px; cursor: pointer; display: flex; align-items: center;",
          onClick: handleOnClick,
        },
        isEdit.value
          ? h(NInput, {
              ref: inputRef,
              value: String(inputValue.value),
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
          : h("span", {}, props.value || props.placeholder)
      );
  },
});

// 筛选密钥选择（支持 tempId 字符串或 id 数字，空字符串表示"全部"）
const selectedKeyFilter = ref<string | null>("");

// 密钥筛选选项
const keyFilterOptions = computed(() => {
  const options = [{ label: "全部", value: "" }];

  props.availableKeys.forEach((key, index) => {
    // 使用 tempId 或 id 作为唯一标识
    const keyIdentifier = key.tempId || (key.id ? String(key.id) : null);
    if (keyIdentifier) {
      const keyLabel = key.id && key.id > 0 ? `密钥 #${key.id}` : `新密钥 #${index + 1}`;
      options.push({
        label: keyLabel,
        value: keyIdentifier,
      });
    }
  });

  return options;
});

// 是否可以添加模型（需要至少有一个密钥）
const canAddModel = computed(() => props.availableKeys.length > 0);

// 根据筛选条件过滤模型
const filteredModels = computed(() => {
  if (selectedKeyFilter.value === null || selectedKeyFilter.value === "") {
    return props.models;
  }

  return props.models.filter((model) => {
    if (!model.api_keys || model.api_keys.length === 0) {
      return false;
    }
    // 支持通过 tempId 或 id 进行筛选
    return model.api_keys.some((k) => {
      const keyIdentifier = k.tempId || (k.id ? String(k.id) : null);
      return keyIdentifier === selectedKeyFilter.value;
    });
  });
});

const removeModel = (model: Model & { health_status?: HealthStatus }) => {
  const modelIndex = props.models.indexOf(model);
  // 在"全部"视图时传递 null（完全删除模型）
  // 在特定密钥视图时传递密钥标识符（解除该密钥的关联）
  const keyIdentifier =
    selectedKeyFilter.value === "" || selectedKeyFilter.value === null
      ? null
      : selectedKeyFilter.value;
  emit("removeModel", modelIndex, keyIdentifier);
};

const updateModelName = (index: number, value: string) => {
  const newModels = [...props.models];
  newModels[index] = {
    ...newModels[index],
    name: value,
    isDirty: true,
  };
  emit("update:models", newModels);
};

const updateModelAlias = (index: number, value: string) => {
  const newModels = [...props.models];
  newModels[index] = {
    ...newModels[index],
    alias: value,
    isDirty: true,
  };
  emit("update:models", newModels);
};

const handleAddModel = () => {
  emit("addModel", selectedKeyFilter.value);
};

const importFromClipboard = async () => {
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

    emit("importFromClipboard", modelNames, selectedKeyFilter.value);
    message.success(`成功读取 ${modelNames.length} 个模型`);
  } catch (error) {
    message.error("读取剪切板失败，请检查浏览器权限");
    console.error("Clipboard read error:", error);
  }
};

// 定义数据表格列
const columns = computed<DataTableColumns<Model & { health_status?: HealthStatus }>>(() => [
  {
    title: "模型名",
    key: "name",
    render(row) {
      const modelIndex = props.models.indexOf(row);
      return h(ShowOrEdit, {
        value: row.name,
        onUpdateValue: (v: string) => {
          updateModelName(modelIndex, v);
        },
      });
    },
  },
  {
    title: "别名",
    key: "alias",
    render(row) {
      const modelIndex = props.models.indexOf(row);
      return h(ShowOrEdit, {
        value: row.alias,
        onUpdateValue: (v: string) => {
          updateModelAlias(modelIndex, v);
        },
      });
    },
  },
  {
    title: "密钥",
    key: "api_keys",
    width: 150,
    render(row) {
      if (selectedKeyFilter.value === null || selectedKeyFilter.value === "") {
        // 全部视图：显示密钥数量
        if (row.api_keys && row.api_keys.length > 0) {
          return h(
            NTag,
            {
              type: "info",
              size: "small",
            },
            { default: () => `${row.api_keys!.length} 个密钥` }
          );
        }
        return h("span", {}, "无密钥");
      } else {
        // 筛选视图：显示密钥 ID
        const key = row.api_keys?.find((k) => {
          const keyIdentifier = k.tempId || (k.id ? String(k.id) : null);
          return keyIdentifier === selectedKeyFilter.value;
        });
        if (key) {
          return h(
            NTag,
            {
              type: "info",
              size: "small",
            },
            { default: () => (key.id && key.id > 0 ? `密钥 #${key.id}` : "新密钥") }
          );
        }
        return h("span", {}, "-");
      }
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
        const statusMap: Record<
          HealthStatus,
          { text: string; type: "default" | "success" | "warning" | "error" }
        > = {
          [HealthStatusEnum.Unknown]: { text: "未知", type: "default" },
          [HealthStatusEnum.Available]: { text: "可用", type: "success" },
          [HealthStatusEnum.Warning]: { text: "警告", type: "warning" },
          [HealthStatusEnum.Unavailable]: { text: "禁用", type: "error" },
        };
        const status = row.health_status ?? HealthStatusEnum.Unknown;
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
    render(row) {
      const isFiltered = selectedKeyFilter.value !== null && selectedKeyFilter.value !== "";
      const status = row.health_status ?? HealthStatusEnum.Unknown;
      const isUnavailable = status === HealthStatusEnum.Unavailable;
      const isUnknown = status === HealthStatusEnum.Unknown;

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
                disabled: isUnknown || !row.id || row.id <= 0,
                onClick: () => emit("enableHealth", row.id),
              },
              { default: () => enableButtonText }
            ),
            h(
              NButton,
              {
                quaternary: true,
                size: "small",
                type: "error",
                disabled: isUnavailable || !row.id || row.id <= 0,
                onClick: () => emit("disableHealth", row.id),
              },
              { default: () => "禁用" }
            ),
            h(
              NButton,
              {
                size: "small",
                type: "error",
                onClick: () => removeModel(row),
              },
              { default: () => (isFiltered ? "解除关联" : "删除") }
            ),
          ],
        }
      );
    },
  },
]);
</script>

<template>
  <div>
    <n-h4>模型列表</n-h4>
    <n-space style="margin-bottom: 16px">
      <n-button-group>
        <n-button
          @click="handleAddModel"
          :disabled="!canAddModel"
          :title="canAddModel ? '添加模型' : '请先添加密钥'"
        >
          添加模型
        </n-button>
        <n-button
          circle
          @click="importFromClipboard"
          :disabled="!canAddModel"
          :title="canAddModel ? '从剪切板导入' : '请先添加密钥'"
        >
          <template #icon>
            <n-icon><Clipboard /></n-icon>
          </template>
        </n-button>
      </n-button-group>
      <n-button @click="emit('openRenameModal')">自动重命名</n-button>
    </n-space>

    <n-space style="margin-bottom: 16px" align="center">
      <span style="font-size: 14px">筛选密钥：</span>
      <n-select
        v-model:value="selectedKeyFilter"
        :options="keyFilterOptions"
        style="width: 200px"
        placeholder="选择密钥"
      />
      <n-tag v-if="selectedKeyFilter !== null && selectedKeyFilter !== ''" type="info" size="small">
        显示 {{ filteredModels.length }} 个模型
      </n-tag>
      <n-tag v-else type="default" size="small"> 共 {{ models.length }} 个模型 </n-tag>
    </n-space>

    <n-data-table :columns="columns" :data="filteredModels" :bordered="true" size="small" />
  </div>
</template>
