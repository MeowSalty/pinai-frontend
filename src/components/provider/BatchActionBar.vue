<script setup lang="ts">
import { computed } from 'vue'
import { TrashOutline, RefreshOutline, CloseOutline } from '@vicons/ionicons5'
import { useThemeStore } from '@/stores/themeStore'

interface Props {
  selectedCount: number
}

interface Emits {
  delete: []
  updateModels: []
  clear: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.isDark)
</script>

<template>
  <Transition name="batch-action-bar">
    <div v-if="selectedCount > 0" class="batch-action-bar" :class="isDark ? 'is-dark' : 'is-light'">
      <n-badge :value="selectedCount" type="info" />
      已选择

      <div class="divider" aria-hidden="true" />

      <n-space :size="8" align="center" wrap>
        <n-button
          quaternary
          size="small"
          type="error"
          aria-label="批量删除"
          @click="emit('delete')"
        >
          <template #icon>
            <n-icon :component="TrashOutline" />
          </template>
          删除
        </n-button>

        <n-button
          quaternary
          size="small"
          type="primary"
          aria-label="批量更新模型"
          @click="emit('updateModels')"
        >
          <template #icon>
            <n-icon :component="RefreshOutline" />
          </template>
          更新模型
        </n-button>

        <n-button size="small" quaternary circle aria-label="取消选择" @click="emit('clear')">
          <template #icon>
            <n-icon :component="CloseOutline" />
          </template>
        </n-button>
      </n-space>
    </div>
  </Transition>
</template>

<style scoped>
.batch-action-bar {
  position: fixed;
  left: 50%;
  bottom: calc(24px + env(safe-area-inset-bottom));
  transform: translateX(-50%) translateY(0);
  z-index: 1000;

  display: flex;
  align-items: center;
  gap: 16px;

  padding: 12px 20px;
  border-radius: 12px;
  backdrop-filter: blur(12px);

  max-width: min(860px, calc(100vw - 24px));
}

.batch-action-bar.is-light {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.1),
    0 8px 32px rgba(0, 0, 0, 0.08);
}

.batch-action-bar.is-dark {
  background: rgba(24, 24, 27, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.3),
    0 8px 32px rgba(0, 0, 0, 0.2);
}

.divider {
  width: 1px;
  height: 18px;
  background: rgba(127, 127, 127, 0.35);
}

.batch-action-bar-enter-active,
.batch-action-bar-leave-active {
  transition:
    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.batch-action-bar-enter-from,
.batch-action-bar-leave-to {
  transform: translateX(-50%) translateY(calc(100% + 24px));
  opacity: 0;
}

.batch-action-bar-enter-to,
.batch-action-bar-leave-from {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

@media (max-width: 768px) {
  .batch-action-bar {
    left: 12px;
    right: 12px;
    bottom: calc(12px + env(safe-area-inset-bottom));
    transform: translateY(0);
    justify-content: center;
    flex-wrap: wrap;
    padding: 10px 12px;
    gap: 12px;
  }

  .batch-action-bar-enter-from,
  .batch-action-bar-leave-to {
    transform: translateY(calc(100% + 12px));
  }

  .batch-action-bar-enter-to,
  .batch-action-bar-leave-from {
    transform: translateY(0);
  }
}
</style>
