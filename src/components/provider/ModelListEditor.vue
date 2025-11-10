<script setup lang="ts">
import type { Model, ApiKey } from "@/types/provider";
import { Clipboard } from "@vicons/ionicons5";

interface Props {
  models: Model[];
  apiKeyValue: string;
  baseUrl: string;
  format: string;
  availableKeys: (Pick<ApiKey, "value"> & { id?: number | null; tempId?: string })[];
}

interface Emits {
  "update:models": [models: Model[]];
  addModel: [selectedKeyFilter: string | null];
  removeModel: [index: number, keyIdentifier: string | null];
  openRenameModal: [];
  importFromClipboard: [modelNames: string[], selectedKeyFilter: string | null];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

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

const removeModel = (model: Model) => {
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

const message = useMessage();

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

    <n-space
      v-for="(model, index) in filteredModels"
      :key="model.id || index"
      style="margin-bottom: 8px"
    >
      <n-input
        :value="model.name"
        placeholder="名称"
        :status="model.isDirty ? 'warning' : undefined"
        @update:value="(value: string) => updateModelName(models.indexOf(model), value)"
      />
      <n-input
        :value="model.alias"
        placeholder="别名"
        :status="model.isDirty ? 'warning' : undefined"
        @update:value="(value: string) => updateModelAlias(models.indexOf(model), value)"
      />
      <n-tag v-if="model.api_keys && model.api_keys.length > 0" size="small" type="info">
        {{ model.api_keys.length }} 个密钥
      </n-tag>
      <n-button type="error" ghost @click="removeModel(model)">
        {{ selectedKeyFilter !== null && selectedKeyFilter !== "" ? "解除关联" : "删除" }}
      </n-button>
    </n-space>
  </div>
</template>
