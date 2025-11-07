<script setup lang="ts">
import type { Model, ApiKey } from "@/types/provider";
import { Clipboard } from "@vicons/ionicons5";

interface Props {
  models: Model[];
  apiKeyValue: string;
  baseUrl: string;
  format: string;
  availableKeys: (Pick<ApiKey, "value"> & { id?: number | null })[];
}

interface Emits {
  "update:models": [models: Model[]];
  addModel: [];
  removeModel: [index: number, keyId: number | null];
  openRenameModal: [];
  importFromClipboard: [modelNames: string[]];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 筛选密钥选择
const selectedKeyFilter = ref<number | null>(null);

// 密钥筛选选项
const keyFilterOptions = computed(() => {
  const options = [{ label: "全部", value: null as number | null }];

  props.availableKeys
    .filter((key) => key.id && key.id > 0)
    .forEach((key) => {
      options.push({
        label: `密钥 #${key.id}`,
        value: key.id!,
      });
    });

  return options;
});

// 根据筛选条件过滤模型
const filteredModels = computed(() => {
  if (selectedKeyFilter.value === null) {
    return props.models;
  }

  return props.models.filter((model) => {
    if (!model.api_keys || model.api_keys.length === 0) {
      return false;
    }
    return model.api_keys.some((k) => k.id === selectedKeyFilter.value);
  });
});

const removeModel = (model: Model) => {
  const modelIndex = props.models.indexOf(model);
  emit("removeModel", modelIndex, selectedKeyFilter.value);
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

    emit("importFromClipboard", modelNames);
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
        <n-button @click="emit('addModel')">添加模型</n-button>
        <n-button circle @click="importFromClipboard">
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
      <n-tag v-if="selectedKeyFilter !== null" type="info" size="small">
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
        {{ selectedKeyFilter !== null ? "解除关联" : "删除" }}
      </n-button>
    </n-space>
  </div>
</template>
