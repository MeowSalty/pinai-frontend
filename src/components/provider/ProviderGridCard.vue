<script setup lang="ts">
import { computed, h } from 'vue'
import type { DropdownOption } from 'naive-ui'
import { NButton, NDropdown, NFlex, NIcon, NTag, NText, NProgress } from 'naive-ui'
import { EllipsisHorizontal, PencilOutline, RefreshOutline, TrashOutline } from '@vicons/ionicons5'
import { DoDisturbOnOutlined, DoDisturbOffOutlined } from '@vicons/material'
import { HealthStatus } from '@/types/health'
import type { PlatformWithHealth } from '@/types/provider'
import { useProviderDisplay } from '@/composables/useProviderDisplay'

interface Props {
  provider: PlatformWithHealth
  checked: boolean
}

interface Emits {
  'update:checked': [checked: boolean]
  delete: [id: number]
  enableHealth: [id: number]
  disableHealth: [id: number]
  edit: [id: number]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { getProviderTypeTags, getStatusMeta, getUnavailablePercentage } = useProviderDisplay()

const status = computed(() => props.provider.health_status ?? HealthStatus.Unknown)
const statusMeta = computed(() => getStatusMeta(status.value))
const typeTags = computed(() => getProviderTypeTags(props.provider))

const keyCount = computed(() => props.provider.key_count ?? 0)
const modelCount = computed(() => props.provider.model_count ?? 0)

const keyUnavailablePercentage = computed(() =>
  getUnavailablePercentage(props.provider.key_health_count, keyCount.value),
)

const modelUnavailablePercentage = computed(() =>
  getUnavailablePercentage(props.provider.model_health_count, modelCount.value),
)

const dropdownOptions = computed<DropdownOption[]>(() => {
  const isUnavailable = status.value === HealthStatus.Unavailable
  const isUnknown = status.value === HealthStatus.Unknown
  // 与列表视图保持一致：禁用 -> 启用；其他状态 -> 重置；未知状态禁用该操作
  const enableButtonText = isUnavailable ? '启用' : '重置'

  return [
    {
      label: '编辑平台',
      key: 'edit',
      icon: () => h(NIcon, null, { default: () => h(PencilOutline) }),
    },
    {
      label: enableButtonText,
      key: 'enableHealth',
      disabled: isUnknown,
      icon: () =>
        h(NIcon, null, {
          default: () => h(isUnavailable ? DoDisturbOffOutlined : RefreshOutline),
        }),
    },
    {
      label: '禁用',
      key: 'disableHealth',
      disabled: isUnavailable,
      icon: () => h(NIcon, null, { default: () => h(DoDisturbOnOutlined) }),
    },
    {
      label: '删除平台',
      key: 'delete',
      icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
    },
  ]
})

const handleDropdownSelect = (key: string | number) => {
  const id = props.provider.id
  if (key === 'edit') emit('edit', id)
  if (key === 'enableHealth') emit('enableHealth', id)
  if (key === 'disableHealth') emit('disableHealth', id)
  if (key === 'delete') emit('delete', id)
}

const toggleChecked = () => {
  emit('update:checked', !props.checked)
}

const handleCheckboxUpdate = (next: boolean) => {
  emit('update:checked', next)
}

const stop = (e: MouseEvent) => e.stopPropagation()
</script>

<template>
  <n-card
    size="small"
    class="provider-grid-card"
    :class="{ 'is-checked': checked }"
    hoverable
    @click="toggleChecked"
  >
    <template #header>
      <n-flex vertical :size="0">
        <n-flex align="center" size="small" :wrap="false">
          <n-checkbox :checked="checked" @click="stop" @update:checked="handleCheckboxUpdate" />
          <n-ellipsis>
            <template #tooltip>
              {{ provider.name || '-' }}
            </template>
            <n-text strong>{{ provider.name || '-' }}</n-text>
          </n-ellipsis>
        </n-flex>

        <n-ellipsis>
          <template #tooltip>
            {{ provider.base_url || '-' }}
          </template>
          <n-text depth="3" class="provider-grid-card__base-url">{{
            provider.base_url || '-'
          }}</n-text>
        </n-ellipsis>
      </n-flex>
    </template>

    <template #header-extra>
      <n-flex align="center" :size="8" @click="stop">
        <n-tag size="small" :type="statusMeta.type">{{ statusMeta.text }}</n-tag>
        <n-dropdown :options="dropdownOptions" @select="handleDropdownSelect">
          <n-button quaternary circle size="small" aria-label="更多操作">
            <template #icon>
              <n-icon :component="EllipsisHorizontal" />
            </template>
          </n-button>
        </n-dropdown>
      </n-flex>
    </template>

    <n-flex :size="12">
      <n-card embedded size="small" class="provider-grid-card__stat-card">
        <n-flex vertical align="center" :size="4">
          <n-text class="provider-grid-card__stat-value">{{ keyCount }}</n-text>
          <n-text depth="3" class="provider-grid-card__stat-label">密钥</n-text>
          <n-progress
            type="line"
            :percentage="keyUnavailablePercentage"
            status="error"
            :show-indicator="false"
            style="width: 64px"
          />
        </n-flex>
      </n-card>

      <n-card embedded size="small" class="provider-grid-card__stat-card">
        <n-flex vertical align="center" :size="4">
          <n-text class="provider-grid-card__stat-value">{{ modelCount }}</n-text>
          <n-text depth="3" class="provider-grid-card__stat-label">模型</n-text>
          <n-progress
            type="line"
            :percentage="modelUnavailablePercentage"
            status="error"
            :show-indicator="false"
            style="width: 64px"
          />
        </n-flex>
      </n-card>
    </n-flex>

    <template #footer>
      <n-flex :size="6" class="provider-grid-card__tags" @click="stop">
        <n-tag v-for="tag in typeTags" :key="tag.label" size="small" round :color="tag.color">
          {{ tag.label }}
        </n-tag>
      </n-flex>
    </template>
  </n-card>
</template>

<style scoped>
.provider-grid-card {
  border-radius: 14px;
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.provider-grid-card.is-checked {
  border-color: var(--n-color-target);
}

.provider-grid-card__tags {
  flex: 0 0 auto;
}

.provider-grid-card__base-url {
  font-size: 12px;
}

.provider-grid-card__stat-card {
  flex: 1;
  border-radius: 12px;
}

.provider-grid-card__stat-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

.provider-grid-card__stat-label {
  letter-spacing: 0.06em;
  font-size: 10px;
  font-weight: 600;
}
</style>
