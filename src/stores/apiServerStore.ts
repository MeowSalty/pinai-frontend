import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { generateUUID } from '@/utils/uuid'
import type { ApiServer } from '@/types/api'

const LOCAL_STORAGE_SERVERS_KEY = 'pinai_api_servers'
const LOCAL_STORAGE_ACTIVE_ID_KEY = 'pinai_active_api_server_id'

export const useApiServerStore = defineStore('apiServer', () => {
  // State
  const servers = ref<ApiServer[]>([])
  const activeServerId = ref<string | null>(null)

  // Getters
  const activeServer = computed(() => {
    return servers.value.find((s) => s.id === activeServerId.value)
  })

  // Actions
  /**
   * 从 localStorage 加载服务器列表和激活的服务器 ID
   */
  function loadFromLocalStorage() {
    const storedServers = localStorage.getItem(LOCAL_STORAGE_SERVERS_KEY)
    if (storedServers) {
      servers.value = JSON.parse(storedServers)
    }

    const storedActiveId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_ID_KEY)
    if (storedActiveId) {
      activeServerId.value = storedActiveId
    }
  }

  /**
   * 添加一个新服务器
   * @param server - 新服务器的数据，无需 ID
   */
  function addServer(server: Omit<ApiServer, 'id'>) {
    const newServer: ApiServer = {
      ...server,
      id: generateUUID(),
    }
    servers.value.push(newServer)
    // 如果是第一个添加的服务器，则自动设为激活状态
    if (servers.value.length === 1) {
      setActiveServer(newServer.id)
    }
  }

  /**
   * 更新指定 ID 的服务器信息
   * @param id - 要更新的服务器 ID
   * @param serverData - 要更新的服务器数据
   */
  function updateServer(id: string, serverData: Partial<Omit<ApiServer, 'id'>>) {
    const serverIndex = servers.value.findIndex((s) => s.id === id)
    if (serverIndex === -1) return

    // 启用 noUncheckedIndexedAccess 时，数组下标访问会得到 ApiServer | undefined，需要显式判空。
    const existing = servers.value[serverIndex]
    if (!existing) return

    // 合并时避免把必填字段覆盖成 undefined（TS2322 的根因）。
    // token 允许显式清空：仅当 serverData 真的包含 token 字段时才覆盖。
    servers.value[serverIndex] = {
      id: existing.id,
      name: serverData.name ?? existing.name,
      url: serverData.url ?? existing.url,
      token: Object.prototype.hasOwnProperty.call(serverData, 'token')
        ? serverData.token
        : existing.token,
    }
  }

  /**
   * 删除指定 ID 的服务器
   * @param id - 要删除的服务器 ID
   */
  function deleteServer(id: string) {
    const indexToDelete = servers.value.findIndex((s) => s.id === id)
    if (indexToDelete === -1) return

    servers.value.splice(indexToDelete, 1)

    // 如果删除的是当前激活的服务器，则将激活 ID 置空
    if (activeServerId.value === id) {
      activeServerId.value = null
    }
  }

  /**
   * 设置当前激活的服务器
   * @param id - 要激活的服务器 ID
   */
  function setActiveServer(id: string) {
    if (servers.value.some((s) => s.id === id)) {
      activeServerId.value = id
    }
  }

  // 持久化到 localStorage
  watch(
    servers,
    (newServers) => {
      localStorage.setItem(LOCAL_STORAGE_SERVERS_KEY, JSON.stringify(newServers))
    },
    { deep: true },
  )

  watch(activeServerId, (newId) => {
    if (newId) {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_ID_KEY, newId)
    } else {
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_ID_KEY)
    }
  })

  // 初始化时从 localStorage 加载数据
  loadFromLocalStorage()

  return {
    servers,
    activeServerId,
    activeServer,
    loadFromLocalStorage,
    addServer,
    updateServer,
    deleteServer,
    setActiveServer,
  }
})
