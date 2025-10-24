<script setup lang="ts">
import { computed, ref } from "vue";

// 定义一个用于表单的模型类型
interface FormModel {
  id: number;
  platform_id: number;
  name: string;
  alias: string;
  isDirty?: boolean;
}

interface ModelDiff {
  type: "added" | "removed" | "unchanged";
  model: FormModel;
}

const props = defineProps<{
  existingModels: FormModel[];
  newModels: FormModel[];
}>();

const emit = defineEmits<{
  (e: "confirm", selectedModels: FormModel[], removedModels: FormModel[]): void;
  (e: "cancel"): void;
}>();

// 选择要添加的模型
const selectedAddedModels = ref<Record<string, boolean>>({});

// 计算模型差异
const modelDiffs = computed<ModelDiff[]>(() => {
  const diffs: ModelDiff[] = [];

  // 标记现有的模型
  const existingModelNames = new Set(props.existingModels.map((m) => m.name));
  const newModelNames = new Set(props.newModels.map((m) => m.name));

  // 找出被移除的模型（排在前面）
  props.existingModels.forEach((model) => {
    if (!newModelNames.has(model.name)) {
      diffs.push({
        type: "removed",
        model,
      });
    }
  });

  // 找出新增的模型
  props.newModels.forEach((model) => {
    if (!existingModelNames.has(model.name)) {
      diffs.push({
        type: "added",
        model,
      });
      // 默认选中新增的模型
      selectedAddedModels.value[model.name] = true;
    }
  });

  // 找出未变更的模型（排在最后）
  props.existingModels.forEach((model) => {
    if (newModelNames.has(model.name)) {
      diffs.push({
        type: "unchanged",
        model,
      });
    }
  });

  return diffs;
});

// 全选/取消全选新增模型
const toggleSelectAll = (checked: boolean) => {
  const addedModels = modelDiffs.value
    .filter((diff) => diff.type === "added")
    .map((diff) => diff.model.name);

  addedModels.forEach((name) => {
    selectedAddedModels.value[name] = checked;
  });
};

// 确认选择
const handleConfirm = () => {
  // 收集需要保留的模型（未变更的 + 新增且选中的）
  const keptModels = modelDiffs.value
    .filter((diff) => diff.type === "unchanged")
    .map((diff) => diff.model);

  const addedModels = modelDiffs.value
    .filter((diff) => diff.type === "added" && selectedAddedModels.value[diff.model.name])
    .map((diff) => ({
      ...diff.model,
      isDirty: true, // 标记为需要保存
    }));

  // 收集需要删除的模型
  const removedModels = modelDiffs.value
    .filter((diff) => diff.type === "removed")
    .map((diff) => diff.model);

  const finalModels = [...keptModels, ...addedModels];
  emit("confirm", finalModels, removedModels);
};

// 统计信息
const diffStats = computed(() => {
  const added = modelDiffs.value.filter((diff) => diff.type === "added").length;
  const removed = modelDiffs.value.filter((diff) => diff.type === "removed").length;
  const unchanged = modelDiffs.value.filter((diff) => diff.type === "unchanged").length;

  return { added, removed, unchanged };
});

const isSelectAll = computed(() => {
  const addedModels = modelDiffs.value.filter((diff) => diff.type === "added");
  if (addedModels.length === 0) return false;

  return addedModels.every((diff) => selectedAddedModels.value[diff.model.name]);
});
</script>

<template>
  <div>
    <div style="margin-bottom: 16px">
      <p>检测到模型列表有以下变更：</p>
      <div style="display: flex; gap: 16px; margin-top: 8px">
        <n-tag type="success">新增 {{ diffStats.added }} 项</n-tag>
        <n-tag type="error">移除 {{ diffStats.removed }} 项</n-tag>
        <n-tag type="default">不变 {{ diffStats.unchanged }} 项</n-tag>
      </div>
    </div>

    <n-table :bordered="false" :single-line="false">
      <thead>
        <tr>
          <th style="width: 100px">变更类型</th>
          <th>模型名称</th>
          <th style="width: 150px">
            <div style="display: flex; align-items: center; gap: 4px">
              <n-checkbox
                :checked="isSelectAll"
                @update:checked="toggleSelectAll"
                :disabled="modelDiffs.filter((d) => d.type === 'added').length === 0"
              />
              <span>操作</span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="diff in modelDiffs" :key="diff.model.name">
          <td>
            <n-tag v-if="diff.type === 'added'" type="success" size="small">新增</n-tag>
            <n-tag v-else-if="diff.type === 'removed'" type="error" size="small">移除</n-tag>
            <n-tag v-else type="default" size="small">不变</n-tag>
          </td>
          <td>{{ diff.model.name }}</td>
          <td>
            <div v-if="diff.type === 'added'" style="display: flex; align-items: center; gap: 8px">
              <n-checkbox v-model:checked="selectedAddedModels[diff.model.name]" />
              <span>添加到列表</span>
            </div>
            <div v-else-if="diff.type === 'removed'">
              <n-tag type="error" size="small">将被移除</n-tag>
            </div>
            <div v-else>
              <n-tag type="default" size="small">保留</n-tag>
            </div>
          </td>
        </tr>
        <tr v-if="modelDiffs.length === 0">
          <td colspan="3" style="text-align: center; padding: 16px">没有检测到任何变更</td>
        </tr>
      </tbody>
    </n-table>

    <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px">
      <n-button @click="emit('cancel')">取消</n-button>
      <n-button type="primary" @click="handleConfirm">确认变更</n-button>
    </div>
  </div>
</template>

<style scoped>
.n-data-table {
  margin-top: 16px;
}
</style>
