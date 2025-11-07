<script setup lang="ts">
import type { ApiKey } from "@/types/provider";

interface Props {
  apiKeys: (Pick<ApiKey, "value"> & { id?: number | null; isDirty?: boolean })[];
}

interface Emits {
  update: [apiKeys: (Pick<ApiKey, "value"> & { id?: number | null; isDirty?: boolean })[]];
  add: [];
  remove: [index: number];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

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
    { value: "", id: null, isDirty: true }
  ];
  emit("update", newApiKeys);
};

const handleRemoveApiKey = (index: number) => {
  const updatedApiKeys = [...props.apiKeys];
  updatedApiKeys.splice(index, 1);
  emit("update", updatedApiKeys);
  emit("remove", index);
};
</script>

<template>
  <div class="api-key-list">
    <n-form-item label="API 密钥列表">
      <div v-if="apiKeys.length === 0" class="no-api-keys">
        <n-button type="primary" ghost @click="handleAddApiKey">
          添加密钥
        </n-button>
      </div>
      <div v-else class="api-keys-container">
        <div
          v-for="(apiKey, index) in apiKeys"
          :key="index"
          class="api-key-item"
        >
          <n-input-group>
            <n-input
              :value="apiKey.value"
              type="password"
              show-password-on="click"
              :status="apiKey.isDirty ? 'warning' : undefined"
              placeholder="请输入API密钥"
              @update:value="(value: string) => updateApiKey(index, value)"
            />
            <n-button @click="handleRemoveApiKey(index)" type="error" ghost>
              删除
            </n-button>
          </n-input-group>
          <div v-if="apiKey.isDirty" class="key-modified-tag">
            <n-tag type="warning" size="small">已修改</n-tag>
          </div>
        </div>
        <n-button
          type="primary"
          ghost
          @click="handleAddApiKey"
          class="add-key-btn"
        >
          添加密钥
        </n-button>
      </div>
    </n-form-item>
  </div>
</template>

<style scoped>
.api-key-list {
  margin-top: 16px;
}

.api-keys-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.api-key-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.api-key-item .n-input-group {
  width: 100%;
}

.key-modified-tag {
  align-self: flex-start;
}

.add-key-btn {
  align-self: flex-start;
  margin-top: 8px;
}

.no-api-keys {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}
</style>
