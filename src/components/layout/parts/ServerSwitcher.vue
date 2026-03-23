<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { MenuSharp } from '@vicons/ionicons5'
import { useApiServerStore } from '@/stores/apiServerStore'
import { useServerValidation } from '@/composables/useServerValidation'
import type { DropdownOption } from 'naive-ui'

interface Props {
  width?: number
}

const props = withDefaults(defineProps<Props>(), {
  width: 180,
})

const message = useMessage()
const router = useRouter()
const { validateServerConnection } = useServerValidation()

const apiServerStore = useApiServerStore()
const { servers, activeServer } = storeToRefs(apiServerStore)

const dropdownOptions = computed<DropdownOption[]>(() => {
  const serverOptions: DropdownOption[] = servers.value.map((server) => ({
    label: server.name,
    key: server.id,
  }))

  return [
    ...serverOptions,
    { type: 'divider', key: 'divider' },
    { label: '管理服务器', key: 'manage' },
  ]
})

const currentServerText = computed(() => {
  return activeServer.value?.name ?? '未选择服务器'
})

async function handleSelect(key: string | number) {
  if (key === 'manage') {
    await router.push({ path: '/server_config' })
    return
  }

  const targetKey = String(key)
  const server = servers.value.find((item) => item.id === targetKey)
  if (!server) {
    return
  }

  const result = await validateServerConnection(server.url, server.token)
  if (!result.success) {
    message.error('目标服务器连接失败')
    return
  }

  apiServerStore.setActiveServer(targetKey)
  message.success('服务器已切换')
}
</script>

<template>
  <n-dropdown trigger="click" :options="dropdownOptions" @select="handleSelect">
    <n-button quaternary>
      <n-flex justify="space-between" align="center" :style="{ width: `${props.width}px` }">
        <n-ellipsis v-if="activeServer" :style="{ maxWidth: `${props.width - 34}px` }">
          {{ currentServerText }}
        </n-ellipsis>
        <span v-else class="server-switcher__placeholder">{{ currentServerText }}</span>
        <n-icon :component="MenuSharp" />
      </n-flex>
    </n-button>
  </n-dropdown>
</template>

<style scoped>
.server-switcher__placeholder {
  color: #f0a020;
}
</style>
