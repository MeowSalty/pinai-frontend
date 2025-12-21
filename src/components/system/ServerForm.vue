<script setup lang="ts">
import type { FormInst, FormItemRule, FormRules } from "naive-ui";
import type { ValidationResult } from "@/types/api";

/**
 * 服务器表单数据接口
 */
interface ServerFormData {
  name: string;
  url: string;
  token: string;
}

/**
 * 组件 Props
 */
interface Props {
  /** 表单数据（v-model 双向绑定） */
  modelValue: ServerFormData;
  /** 提交按钮文本 */
  submitText?: string;
  /** 是否显示取消按钮 */
  showCancel?: boolean;
  /** 是否处于提交中状态 */
  loading?: boolean;
  /** API 验证函数 */
  validateApi?: (url: string, token?: string) => Promise<ValidationResult>;
}

const props = withDefaults(defineProps<Props>(), {
  submitText: "提交",
  showCancel: false,
  loading: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: ServerFormData];
  submit: [];
  cancel: [];
}>();

// 表单引用
const formRef = ref<FormInst | null>(null);

// 本地表单数据（用于双向绑定）
const localFormData = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

// API 连接错误状态
const apiError = ref<string>("");

// Token 错误状态
const tokenError = ref<string>("");

// 内部 loading 状态（用于 API 验证）
const isValidating = ref(false);

// URL 格式验证器
const urlValidator = (_rule: FormItemRule, value: string): boolean | Error => {
  if (!value) {
    return new Error("请输入 API 基础 URL");
  }
  // 验证 URL 格式（允许 http/https 或本地地址）
  const urlPattern =
    /^(https?:\/\/|http:\/\/localhost|http:\/\/127\.0\.0\.1|http:\/\/\d+\.\d+\.\d+\.\d+)/;
  if (!urlPattern.test(value)) {
    return new Error("请输入有效的 URL（以 http:// 或 https:// 开头）");
  }
  return true;
};

// 表单验证规则
const rules: FormRules = {
  name: {
    required: true,
    message: "请输入服务器名称",
    trigger: ["blur", "input"],
  },
  url: {
    required: true,
    trigger: ["blur", "input"],
    validator: urlValidator,
  },
};

/**
 * 处理表单提交
 */
const handleSubmit = async (e?: Event) => {
  e?.preventDefault();

  // 清除之前的错误
  apiError.value = "";
  tokenError.value = "";

  formRef.value?.validate(async (errors) => {
    if (errors) return;

    // 如果有验证函数，则先验证 API 连接
    if (props.validateApi) {
      isValidating.value = true;
      try {
        const result = await props.validateApi(
          localFormData.value.url,
          localFormData.value.token || undefined
        );
        if (!result.success) {
          if (result.status === 401) {
            tokenError.value = localFormData.value.token ? "密钥错误" : "需要密钥";
          } else {
            apiError.value = "API 连接失败";
          }
          return;
        }
      } catch {
        apiError.value = "API 连接失败";
        return;
      } finally {
        isValidating.value = false;
      }
    }

    emit("submit");
  });
};

/**
 * 处理取消操作
 */
const handleCancel = () => {
  emit("cancel");
};

/**
 * 暴露方法给父组件
 */
defineExpose({
  /**
   * 触发表单验证
   */
  validate: () => formRef.value?.validate(),
  /**
   * 重置验证状态
   */
  restoreValidation: () => formRef.value?.restoreValidation(),
});
</script>

<template>
  <n-form ref="formRef" :model="localFormData" :rules="rules" label-placement="top">
    <n-space vertical :size="16">
      <!-- 服务器名称 -->
      <n-form-item label="名称" path="name">
        <n-input
          v-model:value="localFormData.name"
          placeholder="我的服务器"
          :disabled="loading"
          @keyup.enter="handleSubmit"
        />
      </n-form-item>

      <!-- API Base URL 和 Secret -->
      <n-grid :cols="2" :x-gap="16">
        <n-grid-item>
          <n-form-item
            label="API 基础 URL"
            path="url"
            :validation-status="apiError ? 'error' : undefined"
            :feedback="apiError"
          >
            <n-input
              v-model:value="localFormData.url"
              placeholder="http://127.0.0.1:9090"
              :disabled="loading"
              @keyup.enter="handleSubmit"
            />
          </n-form-item>
        </n-grid-item>
        <n-grid-item>
          <n-form-item
            label="密钥（可选）"
            path="token"
            :validation-status="tokenError ? 'error' : undefined"
            :feedback="tokenError"
          >
            <n-input
              v-model:value="localFormData.token"
              type="password"
              show-password-on="click"
              placeholder=""
              :disabled="loading"
              @keyup.enter="handleSubmit"
            />
          </n-form-item>
        </n-grid-item>
      </n-grid>

      <!-- 按钮组 -->
      <n-space justify="end">
        <n-button v-if="showCancel" :disabled="loading || isValidating" @click="handleCancel">
          取消
        </n-button>
        <n-button type="primary" :loading="loading || isValidating" @click="handleSubmit">
          {{ submitText }}
        </n-button>
      </n-space>
    </n-space>
  </n-form>
</template>
