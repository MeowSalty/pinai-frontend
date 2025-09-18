import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { generateUUID } from "@/utils/uuid";

/**
 * API 服务器的类型定义
 */
export interface ApiServer {
  id: string;
  name: string;
  url: string;
}

const LOCAL_STORAGE_SERVERS_KEY = "pinai_api_servers";
const LOCAL_STORAGE_ACTIVE_ID_KEY = "pinai_active_api_server_id";
const DEFAULT_SERVER: Omit<ApiServer, "id"> = {
  name: "默认 API 服务器",
  url: "", // 空字符串表示使用当前域
};

export const useApiServerStore = defineStore("apiServer", () => {
  // State
  const servers = ref<ApiServer[]>([]);
  const activeServerId = ref<string | null>(null);

  // Getters
  const activeServer = computed(() => {
    return servers.value.find((s) => s.id === activeServerId.value);
  });

  // Actions
  /**
   * 从 localStorage 加载服务器列表和激活的服务器 ID
   */
  function loadFromLocalStorage() {
    const storedServers = localStorage.getItem(LOCAL_STORAGE_SERVERS_KEY);
    if (storedServers) {
      servers.value = JSON.parse(storedServers);
    } else {
      // 如果 localStorage 中没有服务器配置，则添加默认服务器
      addServer(DEFAULT_SERVER);
    }

    const storedActiveId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_ID_KEY);
    if (storedActiveId) {
      activeServerId.value = storedActiveId;
    }

    // 如果加载后没有激活的服务器，且列表不为空，则默认激活第一个
    if (!activeServerId.value && servers.value.length > 0) {
      activeServerId.value = servers.value[0].id;
    }
  }

  /**
   * 添加一个新服务器
   * @param server - 新服务器的数据，无需 ID
   */
  function addServer(server: Omit<ApiServer, "id">) {
    const newServer: ApiServer = {
      ...server,
      id: generateUUID(),
    };
    servers.value.push(newServer);
    // 如果是第一个添加的服务器，则自动设为激活状态
    if (servers.value.length === 1) {
      setActiveServer(newServer.id);
    }
  }

  /**
   * 更新指定 ID 的服务器信息
   * @param id - 要更新的服务器 ID
   * @param serverData - 要更新的服务器数据
   */
  function updateServer(id: string, serverData: Partial<Omit<ApiServer, "id">>) {
    const serverIndex = servers.value.findIndex((s) => s.id === id);
    if (serverIndex !== -1) {
      servers.value[serverIndex] = { ...servers.value[serverIndex], ...serverData };
    }
  }

  /**
   * 删除指定 ID 的服务器
   * @param id - 要删除的服务器 ID
   */
  function deleteServer(id: string) {
    const indexToDelete = servers.value.findIndex((s) => s.id === id);
    if (indexToDelete === -1) return;

    servers.value.splice(indexToDelete, 1);

    // 如果删除的是当前激活的服务器，则将激活 ID 置空
    if (activeServerId.value === id) {
      activeServerId.value = null;
    }
  }

  /**
   * 设置当前激活的服务器
   * @param id - 要激活的服务器 ID
   */
  function setActiveServer(id: string) {
    if (servers.value.some((s) => s.id === id)) {
      activeServerId.value = id;
    }
  }

  // 持久化到 localStorage
  watch(
    servers,
    (newServers) => {
      localStorage.setItem(LOCAL_STORAGE_SERVERS_KEY, JSON.stringify(newServers));
    },
    { deep: true }
  );

  watch(activeServerId, (newId) => {
    if (newId) {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_ID_KEY, newId);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_ID_KEY);
    }
  });

  // 初始化时从 localStorage 加载数据
  loadFromLocalStorage();

  return {
    servers,
    activeServerId,
    activeServer,
    loadFromLocalStorage,
    addServer,
    updateServer,
    deleteServer,
    setActiveServer,
  };
});
