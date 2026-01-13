<script setup lang="ts">
import { h, computed } from "vue";
import type { DataTableColumns, DataTableRowKey } from "naive-ui";
import { NButton, NSpace, NTag } from "naive-ui";
import type { PlatformWithHealth } from "@/types/provider";
import { HealthStatus } from "@/types/provider";
import { useRouter } from "vue-router";
import { useThemeStore } from "@/stores/themeStore";

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
const themeStore = useThemeStore();
const isDark = computed(() => themeStore.isDark);

const MIN_HUE_DISTANCE = 18;
const MAX_HUE_ATTEMPTS = 12;
const hueCache = new Map<string, number>();
const assignedHues = new Set<number>();

const hashString = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

const hueDistance = (a: number, b: number) => {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
};

const getHueForText = (text: string) => {
  const cached = hueCache.get(text);
  if (cached !== undefined) return cached;

  let attempt = 0;
  let hue = Math.abs(hashString(text)) % 360;
  while (attempt < MAX_HUE_ATTEMPTS) {
    let isTooClose = false;
    for (const usedHue of assignedHues) {
      if (hueDistance(hue, usedHue) < MIN_HUE_DISTANCE) {
        isTooClose = true;
        break;
      }
    }
    if (!isTooClose) break;

    attempt += 1;
    const salted = `${text}:${attempt}`;
    hue = Math.abs(hashString(salted)) % 360;
  }

  hueCache.set(text, hue);
  assignedHues.add(hue);
  return hue;
};

const getTagColor = (text: string) => {
  const hue = getHueForText(formatVariantLabel(text));
  const backgroundLightness = isDark.value ? 28 : 92;
  const textLightness = isDark.value ? 88 : 32;
  const borderLightness = isDark.value ? 45 : 75;
  const color = `hsl(${hue}, 70%, ${backgroundLightness}%)`;
  const textColor = `hsl(${hue}, 70%, ${textLightness}%)`;
  const borderColor = `hsl(${hue}, 70%, ${borderLightness}%)`;
  return { color, textColor, borderColor };
};

const formatVariantLabel = (text: string) =>
  text
    .split("_")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ""))
    .join(" ");

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
    title: "类型",
    key: "type",
    render(row) {
      const providerColor = getTagColor(row.provider);
      const variantColor = getTagColor(row.variant);
      return h(
        NSpace,
        { size: "small", wrap: true },
        {
          default: () => [
            h(
              NTag,
              { size: "small", color: providerColor, round: true },
              { default: () => row.provider }
            ),
            h(
              NTag,
              { size: "small", color: variantColor, round: true },
              { default: () => formatVariantLabel(row.variant) }
            ),
          ],
        }
      );
    },
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
