<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useApiServerStore } from "@/stores/apiServerStore";
import { useServerValidation } from "@/composables/useServerValidation";
import { NButton, NDropdown, NEllipsis, NIcon, useMessage } from "naive-ui";
import { MenuSharp } from "@vicons/ionicons5";
import type { DropdownOption } from "naive-ui";
import { RouterLink } from "vue-router";

const message = useMessage();
const { validateServerConnection } = useServerValidation();

const apiServerStore = useApiServerStore();
const { servers, activeServer } = storeToRefs(apiServerStore);

// 构建下拉菜单选项
const dropdownOptions = computed<DropdownOption[]>(() => {
  const serverOptions: DropdownOption[] = servers.value.map((server) => ({
    label: server.name,
    key: server.id,
  }));

  return [
    ...serverOptions,
    { type: "divider", key: "divider" },
    {
      label: () =>
        h(RouterLink, { to: { path: "/server_config" } }, { default: () => "管理服务器" }),
      key: "manage",
    },
  ];
});

// 处理下拉菜单选择
async function handleSelect(key: string) {
  if (key === "manage") return;

  const server = servers.value.find((s) => s.id === key);
  if (!server) return;

  // 验证服务器连接
  const result = await validateServerConnection(server.url, server.token);
  if (!result.success) {
    message.error("目标服务器连接失败");
    return;
  }

  apiServerStore.setActiveServer(key);
  message.success("服务器已切换");
}
</script>

<template>
  <n-layout-header bordered>
    <n-dropdown trigger="click" :options="dropdownOptions" @select="handleSelect">
      <n-button quaternary>
        <n-flex justify="space-between" style="width: 164px">
          <n-ellipsis v-if="activeServer" style="max-width: 130px">
            {{ activeServer.name }}
          </n-ellipsis>
          <span v-else style="color: #f0a020">未选择服务器</span>
          <n-icon :component="MenuSharp" />
        </n-flex>
      </n-button>
    </n-dropdown>
  </n-layout-header>
</template>

<style>
.n-layout-header {
  height: 64px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
