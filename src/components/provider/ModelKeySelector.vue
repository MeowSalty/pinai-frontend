<script setup lang="ts">
import type { ApiKey } from "@/types/provider";

interface Props {
  selectedKeyIds: number[];
  availableKeys: (Pick<ApiKey, "value"> & { id?: number | null })[];
}

interface Emits {
  "update:selectedKeyIds": [keyIds: number[]];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const keyOptions = computed(() => {
  return props.availableKeys
    .filter((key) => key.id && key.id > 0)
    .map((key) => ({
      label: `密钥 #${key.id} (${key.value ? key.value.substring(0, 10) + "..." : "未设置"})`,
      value: key.id!,
    }));
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
