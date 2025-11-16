<script setup lang="ts">
import type { ApiKey } from "@/types/provider";
import { Clipboard } from "@vicons/ionicons5";
import { generateUUID } from "@/utils/uuid";

interface Props {
  apiKeys: (Pick<ApiKey, "value"> & { id?: number | null; isDirty?: boolean; tempId?: string })[];
  platformFormat?: string;
  baseUrl?: string;
  isFetchingModels?: boolean;
}

interface Emits {
  update: [
    apiKeys: (Pick<ApiKey, "value"> & { id?: number | null; isDirty?: boolean; tempId?: string })[]
  ];
  add: [];
  remove: [index: number];
  fetchModelsByKey: [keyInfo: { id: number; tempId?: string; value: string }, keyIndex: number];
  importFromClipboard: [modelNames: string[], keyId: number, keyIndex: number];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const message = useMessage();

// 本地加载状态：追踪正在加载的密钥索引
const loadingKeys = ref<Set<number>>(new Set());

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
  apiKey: Pick<ApiKey, "value"> & { id?: number | null; isDirty?: boolean; tempId?: string }
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
  // 父组件需要在密钥被删除前访问密钥信息（ID、tempId）
  // 来清理模型关联并添加到 deletedApiKeyIds 列表
  emit("remove", index);

  // 然后再从本地数组中删除密钥并更新状态
  const updatedApiKeys = [...props.apiKeys];
  updatedApiKeys.splice(index, 1);
  emit("update", updatedApiKeys);
};
</script>

<template>
  <div class="api-key-list">
    <n-form-item label="API 密钥列表">
      <div v-if="apiKeys.length === 0" class="no-api-keys">
        <n-button type="primary" ghost @click="handleAddApiKey"> 添加密钥 </n-button>
      </div>
      <div v-else class="api-keys-container">
        <div v-for="(apiKey, index) in apiKeys" :key="index" class="api-key-item">
          <n-input-group>
            <n-input
              :value="apiKey.value"
              type="password"
              show-password-on="click"
              :status="apiKey.isDirty ? 'warning' : undefined"
              placeholder="请输入API密钥"
              @update:value="(value: string) => updateApiKey(index, value)"
            />
            <n-button
              @click="handleFetchModels(index)"
              :disabled="isFetchDisabled(apiKey)"
              :loading="isKeyLoading(index)"
              ghost
            >
              获取模型
            </n-button>
            <n-button
              @click="importFromClipboard(index)"
              :disabled="!apiKey.id && !apiKey.tempId"
              ghost
              title="从剪切板导入模型（逗号分隔）"
            >
              <template #icon>
                <n-icon><Clipboard /></n-icon>
              </template>
            </n-button>
            <n-button @click="handleRemoveApiKey(index)" type="error" ghost> 删除 </n-button>
          </n-input-group>
          <div v-if="apiKey.isDirty" class="key-modified-tag">
            <n-tag type="warning" size="small">已修改</n-tag>
          </div>
        </div>
        <n-button type="primary" ghost @click="handleAddApiKey" class="add-key-btn">
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
