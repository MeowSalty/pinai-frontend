<script setup lang="ts">
import type { Model } from "@/types/provider";
import { Clipboard } from "@vicons/ionicons5";

interface Props {
  models: Model[];
  isFetchingModels: boolean;
  isFetchDisabled: boolean;
  apiKeyValue: string;
  baseUrl: string;
  format: string;
}

interface Emits {
  "update:models": [models: Model[]];
  addModel: [];
  removeModel: [index: number];
  fetchModels: [];
  openRenameModal: [];
  importFromClipboard: [modelNames: string[]];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const removeModel = (index: number) => {
  emit("removeModel", index);
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
      <n-button @click="emit('addModel')">添加模型</n-button>
      <n-button-group>
        <n-button
          @click="emit('fetchModels')"
          :loading="isFetchingModels"
          :disabled="isFetchDisabled"
        >
          获取模型
        </n-button>
        <n-button circle @click="importFromClipboard">
          <template #icon>
            <n-icon><Clipboard /></n-icon>
          </template>
        </n-button>
      </n-button-group>
      <n-button @click="emit('openRenameModal')">自动重命名</n-button>
    </n-space>
    <n-space v-for="(model, index) in models" :key="index" style="margin-bottom: 8px">
      <n-input
        :value="model.name"
        placeholder="名称"
        :status="model.isDirty ? 'warning' : undefined"
        @update:value="(value: string) => updateModelName(index, value)"
      />
      <n-input
        :value="model.alias"
        placeholder="别名"
        :status="model.isDirty ? 'warning' : undefined"
        @update:value="(value: string) => updateModelAlias(index, value)"
      />
      <n-button type="error" ghost @click="removeModel(index)">删除</n-button>
    </n-space>
  </div>
</template>
