<script setup lang="ts">
import { h, ref, computed } from "vue";
import type { DataTableColumns, DataTableRowKey } from "naive-ui";
import { NButton, NSpace, NCard } from "naive-ui";
import type { Platform } from "@/types/provider";

interface Props {
  providers: Platform[];
  isLoading: boolean;
}

interface Emits {
  edit: [row: Platform];
  delete: [id: number];
  add: [];
  batchImport: [];
  batchUpdateModels: [selectedProviders: Platform[]];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 多选相关状态
const checkedRowKeys = ref<DataTableRowKey[]>([]);

// 处理多选变化
const handleCheck = (rowKeys: DataTableRowKey[]) => {
  checkedRowKeys.value = rowKeys;
};

// 获取选中的供应商
const selectedProviders = computed(() => {
  return props.providers.filter((provider) => checkedRowKeys.value.includes(provider.id));
});

// 行键函数
const rowKey = (row: Platform) => row.id;

// 批量更新模型
const handleBatchUpdateModels = () => {
  if (selectedProviders.value.length === 0) {
    return;
  }
  emit("batchUpdateModels", selectedProviders.value);
};

const createColumns = (): DataTableColumns<Platform> => [
  {
    type: "selection",
  },
  {
    title: "名称",
    key: "name",
  },
  {
    title: "API 类型",
    key: "format",
  },
  {
    title: "API 端点",
    key: "base_url",
  },
  {
    title: "操作",
    key: "actions",
    render(row) {
      return h(
        NSpace,
        {},
        {
          default: () => [
            h(
              NButton,
              {
                quaternary: true,
                size: "small",
                onClick: () => emit("edit", row),
              },
              { default: () => "修改" }
            ),
            h(
              NButton,
              {
                quaternary: true,
                size: "small",
                type: "error",
                onClick: () => emit("delete", row.id),
              },
              { default: () => "删除" }
            ),
          ],
        }
      );
    },
  },
];

const columns = createColumns();
</script>

<template>
  <n-card title="供应商管理">
    <template #header-extra>
      <n-space>
        <n-button
          type="primary"
          @click="handleBatchUpdateModels"
          :disabled="selectedProviders.length === 0"
        >
          批量更新模型 ({{ selectedProviders.length }})
        </n-button>
        <n-button type="primary" @click="emit('add')">添加供应商</n-button>
        <n-button @click="emit('batchImport')">批量导入</n-button>
      </n-space>
    </template>
    <n-data-table
      :columns="columns"
      :data="providers"
      :loading="isLoading"
      :bordered="false"
      :single-line="false"
      :row-key="rowKey"
      @update:checked-row-keys="handleCheck"
    />
  </n-card>
</template>
