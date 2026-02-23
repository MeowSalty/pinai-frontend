<script setup lang="ts">
import type { ProviderUpdateRequest, ApiKey, Endpoint } from "@/types/provider";
import type { Model } from "@/types/provider";
import type { FormInst, FormRules } from "naive-ui";
import ApiKeyListEditor from "./ApiKeyListEditor.vue";
import CustomHeadersEditor from "./CustomHeadersEditor.vue";
import { generateUUID } from "@/utils/uuid";

interface Props {
  provider: ProviderUpdateRequest | null;
  formMode: "add" | "edit";
  isLoading: boolean;
  isApiKeyDirty: boolean;
  apiFormatOptions: Array<{ label: string; value: string }>;
  getVariantOptions?: (provider: string) => Array<{ label: string; value: string }>;
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

const dirtyFlags = reactive({
  name: false,
  baseUrl: false,
});

const basicValidationTriggered = ref(false);

watch(
  () => props.provider?.platform?.isDirty,
  (isDirty) => {
    if (!isDirty) {
      dirtyFlags.name = false;
      dirtyFlags.baseUrl = false;
      basicValidationTriggered.value = false;
    }
  },
  { immediate: true },
);

// 表单引用
const formRef = ref<FormInst | null>(null);
const message = useMessage();

const resolveVariantOptions = (provider: string) => {
  return props.getVariantOptions ? props.getVariantOptions(provider) : [];
};

// 表单验证规则
const rules: FormRules = {};

const platformNameValidationStatus = computed(() => {
  const value = (props.provider?.platform.name || "").trim();
  if (!value && (dirtyFlags.name || basicValidationTriggered.value)) return "error";
  if (dirtyFlags.name) return "warning";
  return undefined;
});

const platformNameFeedback = computed(() => {
  if (platformNameValidationStatus.value === "error") return "请输入供应商名称";
  if (platformNameValidationStatus.value === "warning") return "已修改";
  return "";
});

const platformBaseUrlValidationStatus = computed(() => {
  const value = (props.provider?.platform.base_url || "").trim();
  if (!value && (dirtyFlags.baseUrl || basicValidationTriggered.value)) return "error";
  if (dirtyFlags.baseUrl) return "warning";
  return undefined;
});

const platformBaseUrlFeedback = computed(() => {
  if (platformBaseUrlValidationStatus.value === "error") return "请输入 API 端点";
  if (platformBaseUrlValidationStatus.value === "warning") return "已修改";
  return "";
});

// 处理表单提交
const handleFormSubmit = async () => {
  if (!formRef.value) return;

  basicValidationTriggered.value = true;
  const hasBasicError =
    platformNameValidationStatus.value === "error" ||
    platformBaseUrlValidationStatus.value === "error";
  if (hasBasicError) {
    message.error("请填写所有必填项");
    return;
  }

  try {
    await formRef.value.validate();
    emit("submit");
  } catch {
    message.error("请填写所有必填项");
  }
};

const updatePlatformName = (value: string) => {
  if (props.provider) {
    dirtyFlags.name = true;
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

const updatePlatformBaseUrl = (value: string) => {
  if (props.provider) {
    dirtyFlags.baseUrl = true;
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

const ensureEndpoints = (provider: ProviderUpdateRequest): Endpoint[] => {
  return provider.platform.endpoints ? [...provider.platform.endpoints] : [];
};

const updateEndpoints = (endpoints: Endpoint[]) => {
  if (!props.provider) return;
  emit("update:provider", {
    ...props.provider,
    platform: {
      ...props.provider.platform,
      endpoints,
      isDirty: true,
    },
  });
};

const addEndpoint = () => {
  if (!props.provider) return;
  const endpoints = ensureEndpoints(props.provider);
  const hasDefault = endpoints.some((endpoint) => endpoint.is_default);
  endpoints.push({
    endpoint_type: "",
    endpoint_variant: "",
    path: "",
    custom_headers: {},
    is_default: !hasDefault,
    isDirty: true,
    tempId: generateUUID(),
  });
  updateEndpoints(endpoints);
};

const removeEndpoint = (index: number) => {
  if (!props.provider) return;
  const endpoints = ensureEndpoints(props.provider);
  const removed = endpoints.splice(index, 1)[0];
  const deletedIds = [...(props.provider.deletedEndpointIds || [])];
  if (removed?.id) {
    deletedIds.push(removed.id);
  }

  let nextEndpoints = endpoints;
  if (nextEndpoints.length > 0 && !nextEndpoints.some((item) => item.is_default)) {
    nextEndpoints = nextEndpoints.map((item, idx) => ({
      ...item,
      is_default: idx === 0,
    }));
  }

  emit("update:provider", {
    ...props.provider,
    platform: {
      ...props.provider.platform,
      endpoints: nextEndpoints,
      isDirty: true,
    },
    deletedEndpointIds: deletedIds,
  });
};

const patchEndpoint = (index: number, patch: Partial<Endpoint>) => {
  if (!props.provider) return;
  const endpoints = ensureEndpoints(props.provider);
  const target = endpoints[index];
  if (!target) return;
  endpoints[index] = {
    ...target,
    ...patch,
    isDirty: true,
  };
  updateEndpoints(endpoints);
};

const updateEndpointType = (index: number, value: string) => {
  const options = resolveVariantOptions(value);
  const nextVariant = options[0]?.value || "";
  patchEndpoint(index, {
    endpoint_type: value,
    endpoint_variant: nextVariant,
  });
};

const setDefaultEndpoint = (index: number) => {
  if (!props.provider) return;
  const endpoints = ensureEndpoints(props.provider);
  const nextEndpoints = endpoints.map((endpoint, idx) => ({
    ...endpoint,
    is_default: idx === index,
    isDirty: true,
  }));
  updateEndpoints(nextEndpoints);
};

const updateEndpointHeaders = (index: number, headers: Record<string, string>) => {
  patchEndpoint(index, { custom_headers: headers });
};

const getOptionLabel = (options: Array<{ label: string; value: string }>, value: string) => {
  if (!value) return "";
  return options.find((option) => option.value === value)?.label || value;
};

const getEndpointTitle = (endpoint: Endpoint) => {
  const typeLabel = getOptionLabel(props.apiFormatOptions, endpoint.endpoint_type);
  const variantLabel = getOptionLabel(
    resolveVariantOptions(endpoint.endpoint_type),
    endpoint.endpoint_variant,
  );
  if (typeLabel && variantLabel) return `${typeLabel} / ${variantLabel}`;
  if (typeLabel) return typeLabel;
  return `未知端点`;
};

const getDefaultEndpointPath = (type: string, variant: string) => {
  if (type === "openai") {
    if (variant === "chat_completions") return "v1/chat/completions";
    if (variant === "responses") return "v1/responses";
  }
  if (type === "google" && variant === "generate") return "v1beta/models";
  if (type === "anthropic" && variant === "messages") return "v1/messages";
  return "";
};

const joinBaseAndPath = (baseUrl: string, path: string) => {
  const base = baseUrl.replace(/\/+$/, "");
  const nextPath = path.replace(/^\/+/, "");
  if (!base) return nextPath ? `/${nextPath}` : "";
  if (!nextPath) return base;
  return `${base}/${nextPath}`;
};

const buildEndpointPreview = (endpoint: Endpoint) => {
  const rawPath = (endpoint.path || "").trim();
  const defaultPath = getDefaultEndpointPath(endpoint.endpoint_type, endpoint.endpoint_variant);

  if (!rawPath) {
    return joinBaseAndPath(props.provider?.platform.base_url || "", defaultPath);
  }

  if (rawPath.endsWith("/")) {
    const prefix = rawPath.replace(/\/+$/, "");
    const combined = defaultPath ? `${prefix}/${defaultPath}` : prefix;
    return joinBaseAndPath(props.provider?.platform.base_url || "", combined);
  }

  return joinBaseAndPath(props.provider?.platform.base_url || "", rawPath);
};

const updateApiKeys = (
  apiKeys: (Pick<ApiKey, "value"> & { id?: number | null; isDirty?: boolean; tempId?: string })[],
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
          <n-card size="small" title="基础配置">
            <n-grid :cols="2" :x-gap="16" :y-gap="12" responsive="screen">
              <n-grid-item>
                <n-form-item
                  label="供应商名称"
                  path="platform.name"
                  label-placement="top"
                  :validation-status="platformNameValidationStatus"
                  :feedback="platformNameFeedback"
                >
                  <n-input :value="provider.platform.name" @update:value="updatePlatformName" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item
                  label="API 端点"
                  path="platform.base_url"
                  label-placement="top"
                  :validation-status="platformBaseUrlValidationStatus"
                  :feedback="platformBaseUrlFeedback"
                >
                  <n-input
                    :value="provider.platform.base_url"
                    @update:value="updatePlatformBaseUrl"
                  />
                </n-form-item>
              </n-grid-item>
            </n-grid>
          </n-card>

          <div class="endpoint-section">
            <div class="endpoint-section__header">
              <div class="endpoint-section__title">端点管理</div>
              <n-button type="primary" size="small" @click="addEndpoint">添加端点</n-button>
            </div>
            <div class="endpoint-section__body">
              <n-card
                v-for="(endpoint, index) in provider.platform.endpoints || []"
                :key="endpoint.id || endpoint.tempId || index"
                size="small"
                class="endpoint-card"
              >
                <template #header>
                  <div class="endpoint-card__title">
                    <span>{{ getEndpointTitle(endpoint) }}</span>
                    <n-tag v-if="endpoint.is_default" type="success" size="small">默认</n-tag>
                  </div>
                </template>
                <template #header-extra>
                  <n-button
                    :disabled="endpoint.is_default"
                    size="tiny"
                    quaternary
                    @click="setDefaultEndpoint(index)"
                  >
                    设为默认
                  </n-button>
                  <n-button size="tiny" quaternary type="error" @click="removeEndpoint(index)">
                    删除
                  </n-button>
                </template>
                <n-grid :cols="3" :x-gap="16" :y-gap="12" responsive="screen">
                  <n-grid-item>
                    <n-form-item
                      label="类型"
                      label-placement="top"
                      :path="`platform.endpoints.${index}.endpoint_type`"
                      :rule="{
                        required: true,
                        message: '请选择类型',
                        trigger: ['blur', 'change'],
                      }"
                    >
                      <n-select
                        :value="endpoint.endpoint_type"
                        :options="apiFormatOptions"
                        @update:value="(value: string) => updateEndpointType(index, value)"
                      />
                    </n-form-item>
                  </n-grid-item>
                  <n-grid-item>
                    <n-form-item
                      label="变体"
                      label-placement="top"
                      :path="`platform.endpoints.${index}.endpoint_variant`"
                      :rule="{
                        required: resolveVariantOptions(endpoint.endpoint_type).length > 0,
                        message: '请选择变体',
                        trigger: ['blur', 'change'],
                      }"
                    >
                      <n-select
                        :value="endpoint.endpoint_variant"
                        :options="resolveVariantOptions(endpoint.endpoint_type)"
                        :disabled="resolveVariantOptions(endpoint.endpoint_type).length === 0"
                        placeholder="该类型无可选变体"
                        @update:value="
                          (value: string) => patchEndpoint(index, { endpoint_variant: value })
                        "
                      />
                    </n-form-item>
                  </n-grid-item>
                  <n-grid-item>
                    <n-form-item label="路径" label-placement="top">
                      <n-input
                        :value="endpoint.path"
                        placeholder="留空使用默认值"
                        @update:value="(value: string) => patchEndpoint(index, { path: value })"
                      />
                      <template #feedback>
                        <span class="endpoint-preview">
                          预览：{{ buildEndpointPreview(endpoint) }}
                        </span>
                      </template>
                    </n-form-item>
                  </n-grid-item>
                </n-grid>
                <CustomHeadersEditor
                  :headers="endpoint.custom_headers || {}"
                  @update="
                    (headers: Record<string, string>) => updateEndpointHeaders(index, headers)
                  "
                />
              </n-card>

              <n-empty
                v-if="(provider.platform.endpoints || []).length === 0"
                description="暂无端点"
              />
            </div>
          </div>
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
            :models="provider.models as unknown as Model[]"
            :api-key-value="provider.apiKeys[0]?.value || ''"
            :base-url="provider.platform.base_url"
            :format="
              provider.platform.endpoints?.find((item) => item.is_default)?.endpoint_type || ''
            "
            :available-keys="provider.apiKeys"
            @update:models="updateModels"
            @add-model="(filter: string | null) => emit('addModel', filter)"
            @remove-model="
              (index: number, keyIdentifier: string | null) =>
                emit('removeModel', index, keyIdentifier)
            "
            @open-rename-modal="emit('openRenameModal')"
            @import-from-clipboard="
              (modelNames: string[], filter: string | null) =>
                emit('importFromClipboard', modelNames, filter)
            "
            @fetch-models-by-key="
              (keyInfo: { id: number; tempId?: string; value: string }) =>
                emit('fetchModelsByKey', keyInfo, -1)
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

<style scoped>
.endpoint-section {
  margin-top: 16px;
}

.endpoint-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.endpoint-section__title {
  font-size: 14px;
  font-weight: 600;
}

.endpoint-section__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.endpoint-card__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.endpoint-preview {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
  word-break: break-all;
}
</style>
