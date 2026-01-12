<script setup lang="ts">
import type { ProviderUpdateRequest, ApiKey } from "@/types/provider";
import type { Model } from "@/types/provider";
import type { FormInst, FormRules } from "naive-ui";
import ApiKeyListEditor from "./ApiKeyListEditor.vue";
import CustomHeadersEditor from "./CustomHeadersEditor.vue";

interface Props {
  provider: ProviderUpdateRequest | null;
  formMode: "add" | "edit";
  isLoading: boolean;
  isApiKeyDirty: boolean;
  apiFormatOptions: Array<{ label: string; value: string }>;
  variantOptions: Array<{ label: string; value: string }>;
}

interface Emits {
  submit: [];
  cancel: [];
  "update:provider": [provider: ProviderUpdateRequest];
  markApiKeyDirty: [];
  addModel: [selectedKeyFilter: string | null];
  removeModel: [index: number, keyIdentifier: string | null];
  removeApiKey: [index: number];
  fetchModelsByKey: [keyInfo: { id: number; tempId?: string; value: string }, keyIndex: number];
  openRenameModal: [];
  importFromClipboard: [modelNames: string[], selectedKeyFilter: string | null];
  enableModelHealth: [id: number];
  disableModelHealth: [id: number];
  enableKeyHealth: [id: number];
  disableKeyHealth: [id: number];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 表单引用
const formRef = ref<FormInst | null>(null);
const message = useMessage();

// 表单验证规则
const rules: FormRules = {
  "platform.name": [
    {
      required: true,
      message: "请输入供应商名称",
      trigger: "blur",
    },
  ],
  "platform.provider": [
    {
      required: true,
      message: "请选择 API 类型",
      trigger: "blur",
    },
  ],
  "platform.variant": [
    {
      required: true,
      message: "请选择 API 变体",
      trigger: "blur",
    },
  ],
  "platform.base_url": [
    {
      required: true,
      message: "请输入 API 端点",
      trigger: "blur",
    },
  ],
};

// 处理表单提交
const handleFormSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    emit("submit");
  } catch {
    message.error("请填写所有必填项");
  }
};

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
        provider: value,
        variant: "",
        isDirty: true,
      },
    });
  }
};

const updatePlatformVariant = (value: string) => {
  if (props.provider) {
    emit("update:provider", {
      ...props.provider,
      platform: {
        ...props.provider.platform,
        variant: value,
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

const updateCustomHeaders = (headers: Record<string, string>) => {
  if (props.provider) {
    emit("update:provider", {
      ...props.provider,
      platform: {
        ...props.provider.platform,
        custom_headers: headers,
        isDirty: true,
      },
    });
  }
};

const updateApiKeys = (
  apiKeys: (Pick<ApiKey, "value"> & { id?: number | null; isDirty?: boolean; tempId?: string })[]
) => {
  if (props.provider) {
    emit("update:provider", {
      ...props.provider,
      apiKeys,
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

// 暴露表单提交方法供父组件调用
defineExpose({
  handleFormSubmit,
});
</script>

<template>
  <div v-if="provider">
    <n-form ref="formRef" :model="provider" :rules="rules">
      <n-tabs type="line" animated default-value="basic">
        <n-tab-pane name="basic" tab="基础配置">
          <n-flex>
            <n-form-item label="供应商名称" path="platform.name">
              <n-input
                :value="provider.platform.name"
                @update:value="updatePlatformName"
                autosize
                style="min-width: 200px"
              />
            </n-form-item>
            <n-form-item label="API 类型" path="platform.provider">
              <n-select
                :value="provider.platform.provider"
                :options="apiFormatOptions"
                @update:value="updatePlatformFormat"
                style="width: 120px"
              />
            </n-form-item>
            <n-form-item label="API 变体" path="platform.variant">
              <n-select
                :value="provider.platform.variant"
                :options="variantOptions"
                :disabled="variantOptions.length === 0"
                placeholder="该类型无可选变体"
                style="width: 160px"
                @update:value="updatePlatformVariant"
              />
            </n-form-item>
          </n-flex>
          <n-form-item label="API 端点" path="platform.base_url">
            <n-input
              :value="provider.platform.base_url"
              @update:value="updatePlatformBaseUrl"
              autosize
              style="min-width: 200px"
            />
          </n-form-item>
          <CustomHeadersEditor
            :headers="provider.platform.custom_headers || {}"
            @update="updateCustomHeaders"
          />
        </n-tab-pane>

        <n-tab-pane name="keys" tab="密钥">
          <ApiKeyListEditor
            :api-keys="provider.apiKeys"
            @update="updateApiKeys"
            @remove="(index: number) => emit('removeApiKey', index)"
            @enable-health="(id: number) => emit('enableKeyHealth', id)"
            @disable-health="(id: number) => emit('disableKeyHealth', id)"
          />
        </n-tab-pane>

        <n-tab-pane name="models" tab="模型">
          <ModelListEditor
            :models="(provider.models as unknown) as Model[]"
            :api-key-value="provider.apiKeys[0]?.value || ''"
            :base-url="provider.platform.base_url"
            :format="provider.platform.provider"
            :available-keys="provider.apiKeys"
            @update:models="updateModels"
            @add-model="(filter: string | null) => emit('addModel', filter)"
            @remove-model="
              (index: number, keyIdentifier: string | null) => emit('removeModel', index, keyIdentifier)
            "
            @open-rename-modal="emit('openRenameModal')"
            @import-from-clipboard="
              (modelNames: string[], filter: string | null) =>
                emit('importFromClipboard', modelNames, filter)
            "
            @fetch-models-by-key="
              (keyInfo: { id: number; tempId?: string; value: string }) => emit('fetchModelsByKey', keyInfo, -1)
            "
            @enable-health="(id: number) => emit('enableModelHealth', id)"
            @disable-health="(id: number) => emit('disableModelHealth', id)"
          />
        </n-tab-pane>
      </n-tabs>
    </n-form>

    <n-space justify="end" style="margin-top: 24px">
      <n-button @click="emit('cancel')">取消</n-button>
      <n-button type="primary" :loading="isLoading" @click="handleFormSubmit">
        {{ formMode === "add" ? "创建" : "保存" }}
      </n-button>
    </n-space>
  </div>
</template>
