<script setup lang="ts">
import type { DataTableRowKey } from 'naive-ui'
import { useRouter } from 'vue-router'
import type { PlatformWithHealth } from '@/types/provider'
import ProviderGridCard from '@/components/provider/ProviderGridCard.vue'

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

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()

const isChecked = (id: number) => {
  return (props.checkedRowKeys || []).includes(id)
}

const handleCardCheck = (id: number, checked: boolean) => {
  const current = new Set(props.checkedRowKeys || [])
  if (checked) {
    current.add(id)
  } else {
    current.delete(id)
  }
  emit('update:checkedRowKeys', Array.from(current))
}
</script>

<template>
  <n-spin :show="isLoading">
    <n-grid responsive="screen" :cols="'1 s:2 m:3 l:4'" :x-gap="16" :y-gap="16">
      <n-grid-item v-for="provider in providers" :key="provider.id">
        <ProviderGridCard
          :provider="provider"
          :checked="isChecked(provider.id)"
          @update:checked="handleCardCheck(provider.id, $event)"
          @delete="emit('delete', $event)"
          @enable-health="emit('enableHealth', $event)"
          @disable-health="emit('disableHealth', $event)"
          @edit="router.push(`/provider/${$event}/edit`)"
        />
      </n-grid-item>
    </n-grid>

    <n-empty v-if="providers.length === 0 && !isLoading" description="暂无平台数据" size="large" />
  </n-spin>
</template>
