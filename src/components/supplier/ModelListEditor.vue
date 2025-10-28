<script setup lang="ts">
import type { Model } from "@/types/provider";

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
</script>

<template>
  <div>
    <n-h4>模型列表</n-h4>
    <n-space style="margin-bottom: 16px">
      <n-button @click="emit('addModel')">添加模型</n-button>
      <n-button
        @click="emit('fetchModels')"
        :loading="isFetchingModels"
        :disabled="isFetchDisabled"
      >
        获取模型
      </n-button>
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
