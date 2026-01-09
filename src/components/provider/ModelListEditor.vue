<script setup lang="ts">
import { type ApiKey, HealthStatus, type Model } from "@/types/provider";
import { EllipsisVertical } from "@vicons/ionicons5";
import { useElementBounding, useWindowSize } from "@vueuse/core";
import type { DataTableColumns, DropdownOption, InputInst } from "naive-ui";
import { NButton, NDropdown, NInput, NPopover, NSpace, NTag, NTooltip } from "naive-ui";
import type { PropType } from "vue";
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
  fetchModelsByKey: [keyInfo: { id: number; tempId?: string; value: string }];
  enableHealth: [id: number];
  disableHealth: [id: number];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const message = useMessage();

const HEADER_OFFSET = 42 + 34 + 16;
const TABLE_BOTTOM_MARGIN = 80;
const MIN_TABLE_HEIGHT = 100;
const MAX_VISIBLE_KEYS = 6;

const containerRef = ref<HTMLElement | null>(null);
const { top } = useElementBounding(containerRef);
const { height: windowHeight } = useWindowSize();

const tableMaxHeight = computed(() => {
  const available = windowHeight.value - top.value - HEADER_OFFSET - TABLE_BOTTOM_MARGIN;
  return Math.max(MIN_TABLE_HEIGHT, available);
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

// 密钥选择弹窗状态
const showKeySelector = ref(false);
const pendingModelNames = ref<string[]>([]);
const selectedKeysForAdd = ref<string[]>([]); // 用于剪切板导入（多选）
const selectedKeyForFetch = ref<string | null>(null); // 用于获取模型（单选）

// 计算属性：根据场景返回正确的选中值
const selectedKeyValue = computed({
  get: () => {
    return pendingModelNames.value.length > 0
      ? selectedKeysForAdd.value
      : selectedKeyForFetch.value;
  },
  set: (value) => {
    if (pendingModelNames.value.length > 0) {
      selectedKeysForAdd.value = value as string[];
    } else {
      selectedKeyForFetch.value = value as string | null;
    }
  },
});

// 密钥筛选选项（用于弹窗选择）
const keyFilterOptions = computed(() => {
  const options: Array<{ label: string; value: string }> = [];

  props.availableKeys.forEach((key, index) => {
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

// 下拉菜单选项
const addModelOptions: DropdownOption[] = [
  { label: "剪切板导入", key: "clipboard" },
  { label: "直接添加", key: "add" },
];

// 处理下拉菜单选择
const handleAddModelSelect = (key: string) => {
  if (key === "clipboard") {
    importFromClipboard();
  } else if (key === "add") {
    handleAddModel();
  }
};

const removeModel = (model: Model & { health_status?: HealthStatus }) => {
  const modelIndex = props.models.indexOf(model);
  // 使用表格内置筛选，直接传递 null（完全删除模型）
  emit("removeModel", modelIndex, null);
};

const patchModel = (index: number, payload: Partial<Model>) => {
  const newModels = [...props.models];
  newModels[index] = {
    ...newModels[index],
    ...payload,
    isDirty: true,
  };
  emit("update:models", newModels);
};

const handleAddModel = () => {
  selectedKeysForAdd.value = [];
  selectedKeyForFetch.value = null;
  pendingModelNames.value = [];
  showKeySelector.value = true;
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

    // 弹出密钥选择对话框
    pendingModelNames.value = modelNames;
    selectedKeysForAdd.value = [];
    selectedKeyForFetch.value = null;
    showKeySelector.value = true;
  } catch (error) {
    message.error("读取剪切板失败，请检查浏览器权限");
    console.error("Clipboard read error:", error);
  }
};

const confirmAddModel = () => {
  if (pendingModelNames.value.length > 0) {
    // 从剪切板导入
    const keyFilter =
      selectedKeysForAdd.value.length === 0 ? null : selectedKeysForAdd.value.join(",");
    emit("importFromClipboard", pendingModelNames.value, keyFilter);
    message.success(`成功导入 ${pendingModelNames.value.length} 个模型`);
    pendingModelNames.value = [];
  } else {
    // 获取模型：必须选择一个密钥
    if (!selectedKeyForFetch.value) {
      message.warning("请选择一个密钥");
      return;
    }

    const selectedKey = props.availableKeys.find(
      (key) => (key.tempId || (key.id ? String(key.id) : null)) === selectedKeyForFetch.value
    );

    if (!selectedKey) {
      message.error("未找到选中的密钥");
      return;
    }

    emit("fetchModelsByKey", {
      id: selectedKey.id || 0,
      tempId: selectedKey.tempId,
      value: selectedKey.value,
    });
  }
  showKeySelector.value = false;
};

const HEALTH_STATUS_TAGS: Record<
  HealthStatus,
  { text: string; type: "default" | "success" | "warning" | "error" }
> = {
  [HealthStatus.Unknown]: { text: "未知", type: "default" },
  [HealthStatus.Available]: { text: "可用", type: "success" },
  [HealthStatus.Warning]: { text: "警告", type: "warning" },
  [HealthStatus.Unavailable]: { text: "禁用", type: "error" },
};

// 计算实际需要显示的最大密钥数
const maxVisibleKeyCount = computed(() => {
  let maxCount = 0;
  for (const model of props.models) {
    if (model.api_keys && model.api_keys.length > maxCount) {
      maxCount = model.api_keys.length;
    }
  }
  // 超过 MAX_VISIBLE_KEYS 时，显示 MAX_VISIBLE_KEYS 个 + 一个 +N 标签
  if (maxCount > MAX_VISIBLE_KEYS) {
    return MAX_VISIBLE_KEYS + 1; // +1 是 "+N" 标签
  }
  return maxCount;
});

// 计算密钥列动态宽度
const apiKeyColumnWidth = computed(() => {
  const count = maxVisibleKeyCount.value;
  if (count === 0) {
    return 80; // 只显示"无密钥"时的宽度
  }
  // 每个标签约 35px，额外留 20px 边距
  const width = count * 35 + 20;
  return Math.max(80, width); // 最小 80px
});

// 定义数据表格列
const columns = computed<DataTableColumns<Model & { health_status?: HealthStatus }>>(() => [
  {
    title: "模型名",
    key: "name",
    minWidth: 120,
    render(row) {
      const modelIndex = props.models.indexOf(row);
      return h(ShowOrEdit, {
        value: row.name,
        onUpdateValue: (v: string) => {
          patchModel(modelIndex, { name: v });
        },
      });
    },
  },
  {
    title: "别名",
    key: "alias",
    minWidth: 120,
    render(row) {
      const modelIndex = props.models.indexOf(row);
      return h(ShowOrEdit, {
        value: row.alias,
        onUpdateValue: (v: string) => {
          patchModel(modelIndex, { alias: v });
        },
      });
    },
  },
  {
    title: "密钥",
    key: "api_keys",
    width: apiKeyColumnWidth.value,
    filterOptions: props.availableKeys
      .map((key, index) => {
        const keyIdentifier = key.tempId || (key.id ? String(key.id) : null);
        if (!keyIdentifier) return null;
        const label = key.id && key.id > 0 ? `密钥 #${key.id}` : `新密钥 #${index + 1}`;
        return { label, value: keyIdentifier };
      })
      .filter((opt): opt is { label: string; value: string } => opt !== null),
    filterMultiple: true,
    filter(values, row) {
      const valuesArray = Array.isArray(values) ? values : values ? [values] : [];
      if (valuesArray.length === 0) return true;
      if (!row.api_keys || row.api_keys.length === 0) return false;
      return row.api_keys.some((apiKey) => {
        const keyIdentifier = apiKey.tempId || (apiKey.id ? String(apiKey.id) : null);
        return keyIdentifier !== null && valuesArray.includes(keyIdentifier);
      });
    },
    render(row) {
      if (!row.api_keys || row.api_keys.length === 0) {
        return h("span", {}, "无密钥");
      }

      // 创建标签的辅助函数
      const createKeyTag = (apiKey: (typeof row.api_keys)[0]) => {
        // 查找完整的密钥信息以获取密钥值
        const fullKey = props.availableKeys.find(
          (k) => (k.id && k.id === apiKey.id) || (k.tempId && k.tempId === apiKey.tempId)
        );
        const keyValue = fullKey?.value || "未知";

        let keyLabel;
        if (apiKey.id && apiKey.id > 0) {
          // 已保存的密钥：显示 1, 2 等
          keyLabel = `${apiKey.id}`;
        } else {
          // 新密钥：查找在 availableKeys 中的索引，显示 新 1, 新 2 等
          const newKeyIndex = props.availableKeys.findIndex(
            (k) => k.tempId && k.tempId === apiKey.tempId
          );
          keyLabel = newKeyIndex >= 0 ? `新${newKeyIndex + 1}` : "新";
        }

        return h(
          NTooltip,
          { trigger: "hover" },
          {
            trigger: () => h(NTag, { type: "info", size: "small" }, { default: () => keyLabel }),
            default: () => keyValue,
          }
        );
      };

      // 分离可见密钥和隐藏密钥
      const visibleKeys = row.api_keys.slice(0, MAX_VISIBLE_KEYS);
      const hiddenKeys = row.api_keys.slice(MAX_VISIBLE_KEYS);

      // 创建可见密钥标签
      const tags = visibleKeys.map(createKeyTag);

      // 如果有隐藏的密钥，添加 +N 标签并用 Popover 包装
      if (hiddenKeys.length > 0) {
        const hiddenKeyTags = hiddenKeys.map(createKeyTag);

        tags.push(
          h(
            NPopover,
            { trigger: "hover", placement: "top" },
            {
              trigger: () =>
                h(
                  NTag,
                  { type: "default", size: "small", style: { cursor: "pointer" } },
                  { default: () => `+${hiddenKeys.length}` }
                ),
              default: () =>
                h(
                  NSpace,
                  { size: "small", wrap: true, style: { maxWidth: "300px" } },
                  { default: () => hiddenKeyTags }
                ),
            }
          )
        );
      }

      return h(NSpace, { size: "small", wrap: false }, { default: () => tags });
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

      if (row.health_status !== undefined) {
        const status = row.health_status ?? HealthStatus.Unknown;
        const config = HEALTH_STATUS_TAGS[status];
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
              { default: () => "删除" }
            ),
          ],
        }
      );
    },
  },
]);
</script>

<template>
  <div ref="containerRef">
    <n-space style="margin-bottom: 16px">
      <n-button-group>
        <n-button
          @click="handleAddModel"
          :disabled="!canAddModel"
          :title="canAddModel ? '获取模型' : '请先添加密钥'"
        >
          获取模型
        </n-button>
        <n-dropdown
          :options="addModelOptions"
          :disabled="!canAddModel"
          @select="handleAddModelSelect"
          placement="bottom-end"
        >
          <n-button :disabled="!canAddModel" :title="canAddModel ? '更多选项' : '请先添加密钥'">
            <template #icon>
              <n-icon><EllipsisVertical /></n-icon>
            </template>
          </n-button>
        </n-dropdown>
      </n-button-group>
      <n-button @click="emit('openRenameModal')">自动重命名</n-button>
    </n-space>

    <n-data-table
      :columns="columns"
      :data="models"
      :bordered="true"
      size="small"
      :max-height="tableMaxHeight"
    />

    <!-- 密钥选择弹窗 -->
    <n-modal
      v-model:show="showKeySelector"
      preset="dialog"
      :title="pendingModelNames.length > 0 ? '选择关联密钥' : '获取模型 - 选择密钥'"
      :positive-text="pendingModelNames.length > 0 ? '导入' : '获取模型'"
      negative-text="取消"
      @positive-click="confirmAddModel"
    >
      <n-space vertical>
        <div v-if="pendingModelNames.length > 0">
          将导入 {{ pendingModelNames.length }} 个模型：
          <n-tag
            v-for="name in pendingModelNames.slice(0, 5)"
            :key="name"
            size="small"
            style="margin: 2px"
          >
            {{ name }}
          </n-tag>
          <span v-if="pendingModelNames.length > 5">等...</span>
        </div>
        <div v-else>选择一个密钥来获取可用的模型列表</div>
        <n-select
          v-model:value="selectedKeyValue"
          :options="keyFilterOptions"
          :placeholder="
            pendingModelNames.length > 0 ? '选择密钥（可多选，不选则绑定所有密钥）' : '选择一个密钥'
          "
          :multiple="pendingModelNames.length > 0"
          :clearable="pendingModelNames.length > 0"
        />
      </n-space>
    </n-modal>
  </div>
</template>
