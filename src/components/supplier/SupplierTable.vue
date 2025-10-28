<script setup lang="ts">
import { h } from "vue";
import type { DataTableColumns } from "naive-ui";
import { NButton, NSpace, NCard } from "naive-ui";
import type { Platform } from "@/types/provider";

interface Props {
  suppliers: Platform[];
  isLoading: boolean;
}

interface Emits {
  edit: [row: Platform];
  delete: [id: number];
  add: [];
  batchImport: [];
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const createColumns = (): DataTableColumns<Platform> => [
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
        <n-button type="primary" @click="emit('add')">添加供应商</n-button>
        <n-button @click="emit('batchImport')">批量导入</n-button>
      </n-space>
    </template>
    <n-data-table
      :columns="columns"
      :data="suppliers"
      :loading="isLoading"
      :bordered="false"
      :single-line="false"
    />
  </n-card>
</template>
