<script setup lang="ts">
import { computed } from "vue";
import type { ProviderUpdateRequest } from "@/types/provider";
import type { Model } from "@/types/provider";
import ModelListEditor from "./ModelListEditor.vue";

interface Props {
  supplier: ProviderUpdateRequest | null;
  formMode: "add" | "edit";
  isLoading: boolean;
  isFetchingModels: boolean;
  isApiKeyDirty: boolean;
  apiFormatOptions: Array<{ label: string; value: string }>;
}

interface Emits {
  submit: [];
  cancel: [];
  "update:supplier": [supplier: ProviderUpdateRequest];
  markApiKeyDirty: [];
  addModel: [];
  removeModel: [index: number];
  fetchModels: [];
  openRenameModal: [];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isFetchModelsDisabled = computed(() => {
  if (!props.supplier) return true;
  const { platform, apiKey } = props.supplier;
  return !platform.format || !platform.base_url || !apiKey.value;
});

const updatePlatformName = (value: string) => {
  if (props.supplier) {
    emit("update:supplier", {
      ...props.supplier,
      platform: {
        ...props.supplier.platform,
        name: value,
        isDirty: true,
      },
    });
  }
};

const updatePlatformFormat = (value: string) => {
  if (props.supplier) {
    emit("update:supplier", {
      ...props.supplier,
      platform: {
        ...props.supplier.platform,
        format: value,
        isDirty: true,
      },
    });
  }
};

const updatePlatformBaseUrl = (value: string) => {
  if (props.supplier) {
    emit("update:supplier", {
      ...props.supplier,
      platform: {
        ...props.supplier.platform,
        base_url: value,
        isDirty: true,
      },
    });
  }
};

const updateApiKey = (value: string) => {
  if (props.supplier) {
    emit("update:supplier", {
      ...props.supplier,
      apiKey: {
        ...props.supplier.apiKey,
        value,
      },
    });
    emit("markApiKeyDirty");
  }
};

const updateModels = (models: Model[]) => {
  if (props.supplier) {
    emit("update:supplier", {
      ...props.supplier,
      models,
    });
  }
};
</script>

<template>
  <n-modal
    :show="!!supplier"
    preset="card"
    style="width: 600px"
    :title="formMode === 'add' ? '添加供应商' : '修改供应商'"
    content-style="overflow: auto; max-height: 70vh;"
    @update:show="(show: boolean) => !show && emit('cancel')"
  >
    <n-form v-if="supplier" :model="supplier">
      <n-form-item label="供应商名称" path="platform.name">
        <n-input :value="supplier.platform.name" @update:value="updatePlatformName" />
      </n-form-item>
      <n-form-item label="API 类型" path="platform.format">
        <n-select
          :value="supplier.platform.format"
          :options="apiFormatOptions"
          @update:value="updatePlatformFormat"
        />
      </n-form-item>
      <n-form-item label="API 端点" path="platform.base_url">
        <n-input :value="supplier.platform.base_url" @update:value="updatePlatformBaseUrl" />
      </n-form-item>
      <n-form-item label="API 密钥" path="apiKey.value">
        <n-input
          :value="supplier.apiKey.value"
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
        :models="(supplier.models as unknown) as Model[]"
        :is-fetching-models="isFetchingModels"
        :is-fetch-disabled="isFetchModelsDisabled"
        :api-key-value="supplier.apiKey.value"
        :base-url="supplier.platform.base_url"
        :format="supplier.platform.format"
        @update:models="updateModels"
        @add-model="emit('addModel')"
        @remove-model="(index) => emit('removeModel', index)"
        @fetch-models="emit('fetchModels')"
        @open-rename-modal="emit('openRenameModal')"
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
