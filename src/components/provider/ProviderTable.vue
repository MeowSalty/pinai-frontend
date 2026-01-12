<script setup lang="ts">
import { h } from "vue";
import type { DataTableColumns, DataTableRowKey } from "naive-ui";
import { NButton, NSpace, NTag } from "naive-ui";
import type { PlatformWithHealth } from "@/types/provider";
import { HealthStatus } from "@/types/provider";
import { useRouter } from "vue-router";

interface Props {
  providers: PlatformWithHealth[];
  isLoading: boolean;
  checkedRowKeys?: DataTableRowKey[];
}

interface Emits {
  delete: [id: number];
  enableHealth: [id: number];
  disableHealth: [id: number];
  "update:checkedRowKeys": [keys: DataTableRowKey[]];
}

defineProps<Props>();
const emit = defineEmits<Emits>();
const router = useRouter();

// 行键函数
const rowKey = (row: PlatformWithHealth) => row.id;

const createColumns = (): DataTableColumns<PlatformWithHealth> => [
  {
    type: "selection",
  },
  {
    title: "名称",
    key: "name",
  },
  {
    title: "API 类型",
    key: "provider",
  },
  {
    title: "API 变体",
    key: "variant",
  },
  {
    title: "API 端点",
    key: "base_url",
  },
  {
    title: "状态",
    key: "health_status",
    width: 80,
    filterOptions: [
      { label: "未知", value: HealthStatus.Unknown },
      { label: "可用", value: HealthStatus.Available },
      { label: "警告", value: HealthStatus.Warning },
      { label: "禁用", value: HealthStatus.Unavailable },
    ],
    filterMultiple: true,
    filter(value, row) {
      if (!value) return true;
      const status = row.health_status ?? HealthStatus.Unknown;
      return Array.isArray(value) ? value.includes(status) : status === value;
    },
    render(row) {
      const statusMap = {
        [HealthStatus.Unknown]: { text: "未知", type: "default" as const },
        [HealthStatus.Available]: { text: "可用", type: "success" as const },
        [HealthStatus.Warning]: { text: "警告", type: "warning" as const },
        [HealthStatus.Unavailable]: { text: "禁用", type: "error" as const },
      };
      const status = row.health_status ?? HealthStatus.Unknown;
      const config = statusMap[status];
      return h(NTag, { type: config.type, size: "small" }, { default: () => config.text });
    },
  },
  {
    title: "操作",
    key: "actions",
    render(row) {
      const status = row.health_status ?? HealthStatus.Unknown;
      const isUnavailable = status === HealthStatus.Unavailable;
      const isUnknown = status === HealthStatus.Unknown;

      // 启用/重置按钮文本
      const enableButtonText = isUnavailable ? "启用" : "重置";

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
                onClick: () => router.push(`/provider/${row.id}/edit`),
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
            h(
              NButton,
              {
                quaternary: true,
                size: "small",
                type: "success",
                disabled: isUnknown,
                onClick: () => emit("enableHealth", row.id),
              },
              { default: () => enableButtonText }
            ),
            h(
              NButton,
              {
                quaternary: true,
                size: "small",
                type: "error",
                disabled: isUnavailable,
                onClick: () => emit("disableHealth", row.id),
              },
              { default: () => "禁用" }
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
  <n-data-table
    :columns="columns"
    :data="providers"
    :loading="isLoading"
    :bordered="false"
    :single-line="false"
    :row-key="rowKey"
    :checked-row-keys="checkedRowKeys"
    @update:checked-row-keys="emit('update:checkedRowKeys', $event)"
  />
</template>
