<script setup lang="ts">
import { computed } from "vue";
import type { ProviderUpdateRequest } from "@/types/provider";
import type { Model } from "@/types/provider";

interface Props {
  provider: ProviderUpdateRequest | null;
  formMode: "add" | "edit";
  isLoading: boolean;
  isFetchingModels: boolean;
  isApiKeyDirty: boolean;
  apiFormatOptions: Array<{ label: string; value: string }>;
}

interface Emits {
  submit: [];
  cancel: [];
  "update:provider": [provider: ProviderUpdateRequest];
  markApiKeyDirty: [];
  addModel: [];
  removeModel: [index: number];
  fetchModels: [];
  openRenameModal: [];
  importFromClipboard: [modelNames: string[]];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isFetchModelsDisabled = computed(() => {
  if (!props.provider) return true;
  const { platform, apiKey } = props.provider;
  return !platform.format || !platform.base_url || !apiKey.value;
});

const updatePlatformName = (value: string) => {
  if (props.provider) {
    emit("update:provider", {
      ...props.provider,
      platform: {
        ...props.provider.platform,
        name: value,
        isDirty: true,
      },
    });
  }
};

const updatePlatformFormat = (value: string) => {
  if (props.provider) {
    emit("update:provider", {
      ...props.provider,
      platform: {
        ...props.provider.platform,
        format: value,
        isDirty: true,
      },
    });
  }
};

const updatePlatformBaseUrl = (value: string) => {
  if (props.provider) {
    emit("update:provider", {
      ...props.provider,
      platform: {
        ...props.provider.platform,
        base_url: value,
        isDirty: true,
      },
    });
  }
};

const updateApiKey = (value: string) => {
  if (props.provider) {
    emit("update:provider", {
      ...props.provider,
      apiKey: {
        ...props.provider.apiKey,
        value,
      },
    });
    emit("markApiKeyDirty");
  }
};

const updateModels = (models: Model[]) => {
  if (props.provider) {
    emit("update:provider", {
      ...props.provider,
      models,
    });
  }
};

const handleImportFromClipboard = (modelNames: string[]) => {
  emit("importFromClipboard", modelNames);
};
</script>

<template>
  <n-modal
    :show="!!provider"
    preset="card"
    style="width: 600px"
    :title="formMode === 'add' ? '添加供应商' : '修改供应商'"
    content-style="overflow: auto; max-height: 70vh;"
    @update:show="(show: boolean) => !show && emit('cancel')"
  >
    <n-form v-if="provider" :model="provider">
      <n-form-item label="供应商名称" path="platform.name">
        <n-input :value="provider.platform.name" @update:value="updatePlatformName" />
      </n-form-item>
      <n-form-item label="API 类型" path="platform.format">
        <n-select
          :value="provider.platform.format"
          :options="apiFormatOptions"
          @update:value="updatePlatformFormat"
        />
      </n-form-item>
      <n-form-item label="API 端点" path="platform.base_url">
        <n-input :value="provider.platform.base_url" @update:value="updatePlatformBaseUrl" />
      </n-form-item>
      <n-form-item label="API 密钥" path="apiKey.value">
        <n-input
          :value="provider.apiKey.value"
          type="password"
          show-password-on="click"
          :status="isApiKeyDirty ? 'warning' : undefined"
          :placeholder="formMode === 'edit' ? '如需修改请填写新密钥' : '请输入API密钥'"
          @update:value="updateApiKey"
        />
        <template #suffix>
          <n-tag v-if="isApiKeyDirty && formMode === 'edit'" type="warning" size="small">
            已修改
          </n-tag>
        </template>
      </n-form-item>

      <ModelListEditor
        :models="(provider.models as unknown) as Model[]"
        :is-fetching-models="isFetchingModels"
        :is-fetch-disabled="isFetchModelsDisabled"
        :api-key-value="provider.apiKey.value"
        :base-url="provider.platform.base_url"
        :format="provider.platform.format"
        @update:models="updateModels"
        @add-model="emit('addModel')"
        @remove-model="(index: number) => emit('removeModel', index)"
        @fetch-models="emit('fetchModels')"
        @open-rename-modal="emit('openRenameModal')"
        @import-from-clipboard="handleImportFromClipboard"
      />
    </n-form>
    <template #action>
      <n-space justify="end">
        <n-button @click="emit('cancel')">取消</n-button>
        <n-button type="primary" :loading="isLoading" @click="emit('submit')">
          {{ formMode === "add" ? "创建" : "保存" }}
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>
