<script setup lang="ts">
import { ref, computed } from "vue";
import type { Platform } from "@/types/provider";

interface Props {
  selectedProviders: Platform[];
}

interface Emits {
  (e: "confirm", options: { autoRename: boolean; autoConfirm: boolean }): void;
  (e: "cancel"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const autoRename = ref(false);
const autoConfirm = ref(false);

const providerCount = computed(() => props.selectedProviders.length);

const handleConfirm = () => {
  emit("confirm", {
    autoRename: autoRename.value,
    autoConfirm: autoConfirm.value,
  });
};
</script>

<template>
  <div>
    <div>
      <p>即将更新以下 {{ providerCount }} 个供应商的模型：</p>
    </div>

    <n-scrollbar style="max-height: 200px">
      <n-list bordered>
        <n-list-item v-for="provider in selectedProviders" :key="provider.id">
          <div style="display: flex; flex-direction: column; gap: 4px">
            <div style="font-weight: 500">{{ provider.name }}</div>
            <div style="font-size: 12px; color: #999">
              <n-tag size="small" type="info">{{ provider.format }}</n-tag>
              <span style="margin-left: 8px">{{ provider.base_url }}</span>
            </div>
          </div>
        </n-list-item>
      </n-list>
    </n-scrollbar>

    <n-divider />

    <div style="display: flex; flex-direction: column; gap: 12px">
      <n-checkbox v-model:checked="autoRename">
        <span>自动重命名模型</span>
        <n-text depth="3" style="font-size: 12px; margin-left: 8px">
          (根据预设规则自动重命名获取到的模型)
        </n-text>
      </n-checkbox>

      <n-checkbox v-model:checked="autoConfirm">
        <span>自动确认模型变更</span>
        <n-text depth="3" style="font-size: 12px; margin-left: 8px">
          (跳过差异对比界面，直接应用变更)
        </n-text>
      </n-checkbox>
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px">
      <n-button @click="emit('cancel')">取消</n-button>
      <n-button type="primary" @click="handleConfirm">开始更新</n-button>
    </div>
  </div>
</template>
