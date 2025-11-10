<script setup lang="ts">
import type { ApiKey } from "@/types/provider";

interface Props {
  selectedKeyIds: number[];
  availableKeys: (Pick<ApiKey, "value"> & { id?: number | null; tempId?: string })[];
}

interface Emits {
  "update:selectedKeyIds": [keyIds: number[]];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const keyOptions = computed(() => {
  return props.availableKeys
    .map((key, index) => {
      // 优先使用 id，如果没有则使用 tempId（转换为负数以区分）
      const keyValue = key.id && key.id > 0 ? key.id : -(index + 1); // 使用负数索引表示临时密钥

      const keyLabel =
        key.id && key.id > 0
          ? `密钥 #${key.id} (${key.value ? key.value.substring(0, 10) + "..." : "未设置"})`
          : `新密钥 #${index + 1} (${key.value ? key.value.substring(0, 10) + "..." : "未设置"})`;

      return {
        label: keyLabel,
        value: keyValue,
      };
    })
    .filter((option) => option.value !== 0); // 过滤掉无效的选项
});

const handleUpdateSelection = (value: number[]) => {
  emit("update:selectedKeyIds", value);
};
</script>

<template>
  <n-select
    :value="selectedKeyIds"
    :options="keyOptions"
    multiple
    placeholder="选择密钥"
    @update:value="handleUpdateSelection"
  />
</template>
