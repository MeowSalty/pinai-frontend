<script setup lang="ts">
import { ref } from 'vue';
import { useApiServerStore } from '@/stores/apiServerStore';
import ServerManager from '@/components/system/ServerManager.vue';
import { NButton, NSpace, NTooltip } from 'naive-ui';

const showServerManager = ref(false);

const apiServerStore = useApiServerStore();
const { activeServer } = apiServerStore;
</script>

<template>
  <n-layout-header style="height: 64px; padding: 0 24px; display: flex; align-items: center; justify-content: space-between;" bordered>
    <div><!-- 左侧内容预留 --></div>

    <n-space align="center">
      <n-tooltip trigger="hover">
        <template #trigger>
          <div @click="showServerManager = true" style="cursor: pointer;">
            <n-button v-if="activeServer" text>
              {{ activeServer.name }}
            </n-button>
            <n-button v-else text type="warning">
              未选择服务器
            </n-button>
          </div>
        </template>
        <span v-if="activeServer">
          {{ activeServer.url }}
        </span>
        <span v-else>
          点击以选择或管理服务器
        </span>
      </n-tooltip>
      <!-- 用户头像等其他内容可以放在这里 -->
    </n-space>

    <ServerManager v-model:show="showServerManager" />
  </n-layout-header>
</template>
