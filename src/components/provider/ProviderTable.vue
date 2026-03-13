<script setup lang="ts">
import { h } from 'vue'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import { NButton, NSpace, NTag, NFlex, NText, NProgress } from 'naive-ui'
import type { PlatformWithHealth } from '@/types/provider'
import { HealthStatus } from '@/types/health'
import { useRouter } from 'vue-router'
import { useProviderDisplay } from '@/composables/useProviderDisplay'

interface Props {
  providers: PlatformWithHealth[]
  isLoading: boolean
  checkedRowKeys?: DataTableRowKey[]
}

interface Emits {
  delete: [id: number]
  enableHealth: [id: number]
  disableHealth: [id: number]
  'update:checkedRowKeys': [keys: DataTableRowKey[]]
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()
const { getProviderTypeTags, getStatusMeta, getUnavailablePercentage } = useProviderDisplay()
// 行键函数
const rowKey = (row: PlatformWithHealth) => row.id

const renderTypeTag = (row: PlatformWithHealth) => {
  const tags = getProviderTypeTags(row)
  if (tags.length <= 1) {
    const tag = tags[0]
    return h(
      NTag,
      { size: 'small', round: true, color: tag?.color },
      { default: () => tag?.label ?? '未配置' },
    )
  }

  return h(
    NSpace,
    { size: 'small', wrap: true },
    {
      default: () =>
        tags.map((tag) =>
          h(NTag, { size: 'small', round: true, color: tag.color }, { default: () => tag.label }),
        ),
    },
  )
}

const createColumns = (): DataTableColumns<PlatformWithHealth> => [
  {
    type: 'selection',
  },
  {
    title: '平台',
    key: 'name',
    render(row) {
      return h(
        NFlex,
        { vertical: true, size: 0 },
        {
          default: () => [
            h(NFlex, [
              h(NText, { strong: true }, { default: () => row.name || '-' }),
              renderTypeTag(row),
            ]),
            h(NText, { depth: 3 }, { default: () => row.base_url || '-' }),
          ],
        },
      )
    },
  },
  {
    title: '状态',
    key: 'health_status',
    width: 80,
    filterOptions: [
      { label: '未知', value: HealthStatus.Unknown },
      { label: '可用', value: HealthStatus.Available },
      { label: '警告', value: HealthStatus.Warning },
      { label: '禁用', value: HealthStatus.Unavailable },
    ],
    filterMultiple: true,
    filter(value, row) {
      if (value === null || value === undefined) return true
      const status = row.health_status ?? HealthStatus.Unknown
      return Array.isArray(value) ? value.includes(status) : status === value
    },
    render(row) {
      const status = row.health_status ?? HealthStatus.Unknown
      const config = getStatusMeta(status)
      return h(NTag, { type: config.type, size: 'small' }, { default: () => config.text })
    },
  },
  {
    title: () => h('span', { style: { display: 'block', textAlign: 'center' } }, '密钥数'),
    key: 'key_count',
    width: 80,
    render(row) {
      const count = row.key_count ?? 0
      const unavailablePercentage = getUnavailablePercentage(row.key_health_count, count)

      return h(
        NFlex,
        { align: 'center', justify: 'center' },
        {
          default: () =>
            h(
              NProgress,
              {
                style: {
                  width: '32px',
                },
                strokeWidth: 16,
                type: 'circle',
                percentage: unavailablePercentage,
                status: 'error',
              },
              {
                default: () => h(NText, null, { default: () => String(count) }),
              },
            ),
        },
      )
    },
  },
  {
    title: () => h('span', { style: { display: 'block', textAlign: 'center' } }, '模型数'),
    key: 'model_count',
    width: 80,
    render(row) {
      const count = row.model_count ?? 0
      const unavailablePercentage = getUnavailablePercentage(row.model_health_count, count)

      return h(
        NFlex,
        { vertical: true, size: 2, align: 'center', justify: 'center' },
        {
          default: () => [
            h(NText, null, { default: () => String(count) }),
            h(NProgress, {
              type: 'line',
              percentage: unavailablePercentage,
              status: 'error',
              showIndicator: false,
              style: {
                width: '48px',
              },
            }),
          ],
        },
      )
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 260,
    render(row) {
      const status = row.health_status ?? HealthStatus.Unknown
      const isUnavailable = status === HealthStatus.Unavailable
      const isUnknown = status === HealthStatus.Unknown

      // 启用/重置按钮文本
      const enableButtonText = isUnavailable ? '启用' : '重置'

      return h(NFlex, [
        h(
          NButton,
          {
            quaternary: true,
            size: 'small',
            onClick: () => router.push(`/provider/${row.id}/edit`),
          },
          { default: () => '修改' },
        ),
        h(
          NButton,
          {
            quaternary: true,
            size: 'small',
            type: 'error',
            onClick: () => emit('delete', row.id),
          },
          { default: () => '删除' },
        ),
        h(
          NButton,
          {
            quaternary: true,
            size: 'small',
            type: 'success',
            disabled: isUnknown,
            onClick: () => emit('enableHealth', row.id),
          },
          { default: () => enableButtonText },
        ),
        h(
          NButton,
          {
            quaternary: true,
            size: 'small',
            type: 'error',
            disabled: isUnavailable,
            onClick: () => emit('disableHealth', row.id),
          },
          { default: () => '禁用' },
        ),
      ])
    },
  },
]

const columns = createColumns()
</script>

<template>
  <n-data-table
    :columns="columns"
    :data="providers"
    :loading="isLoading"
    :bordered="false"
    :row-key="rowKey"
    :checked-row-keys="checkedRowKeys"
    @update:checked-row-keys="emit('update:checkedRowKeys', $event)"
  />
</template>
