<script setup lang="ts">
import { ref } from "vue";
import { NCard, NButton, NIcon, NModal, useMessage } from "naive-ui";
import { TrashOutline as TrashIcon, CreateOutline as EditIcon } from "@vicons/ionicons5";
import { storeToRefs } from "pinia";
import { useApiServerStore } from "@/stores/apiServerStore";
import { useServerValidation } from "@/composables/useServerValidation";
import type { ApiServer } from "@/types/api";
import ServerForm from "@/components/system/ServerForm.vue";

// Store
const apiServerStore = useApiServerStore();
const { servers } = storeToRefs(apiServerStore);

// Composables
const message = useMessage();
const { validateServerConnection } = useServerValidation();

// 表单数据
const formModel = ref({
  name: "",
  url: "",
  token: "",
});

// 悬停状态
const hoveredServerId = ref<string | null>(null);

// 编辑模态框状态
const showEditModal = ref(false);
const editingServer = ref<ApiServer | null>(null);

// 编辑表单数据
const editFormModel = ref({
  name: "",
  url: "",
  token: "",
});

// 添加服务器
const handleAdd = () => {
  apiServerStore.addServer({
    name: formModel.value.name,
    url: formModel.value.url,
    token: formModel.value.token || undefined,
  });

  message.success("服务器已添加");

  // 重置表单
  formModel.value.name = "";
  formModel.value.url = "";
  formModel.value.token = "";
};

// 删除服务器
const handleDelete = (id: string, event: Event) => {
  event.stopPropagation();
  apiServerStore.deleteServer(id);
  message.success("服务器已删除");
};

// 设置激活服务器
const handleSetActive = async (id: string) => {
  const server = servers.value.find((s) => s.id === id);
  if (!server) return;

  // 验证服务器连接
  const result = await validateServerConnection(server.url, server.token);
  if (!result.success) {
    message.error("目标服务器连接失败");
    return;
  }

  apiServerStore.setActiveServer(id);
  message.success("服务器已切换");
};

// 打开编辑模态框
const handleEdit = (server: ApiServer, event: Event) => {
  event.stopPropagation();
  editingServer.value = server;
  editFormModel.value.name = server.name;
  editFormModel.value.url = server.url;
  editFormModel.value.token = server.token || "";
  showEditModal.value = true;
};

// 保存编辑
const handleSaveEdit = () => {
  if (!editingServer.value) return;

  apiServerStore.updateServer(editingServer.value.id, {
    name: editFormModel.value.name,
    url: editFormModel.value.url,
    token: editFormModel.value.token || undefined,
  });

  message.success("服务器已更新");
  showEditModal.value = false;
  editingServer.value = null;
};

// 关闭编辑模态框
const handleCloseEdit = () => {
  showEditModal.value = false;
  editingServer.value = null;
};
</script>

<template>
  <div class="server-config-container">
    <!-- 添加服务器表单 -->
    <n-card class="form-card" :bordered="true">
      <server-form
        v-model="formModel"
        submit-text="添加"
        :validate-api="validateServerConnection"
        @submit="handleAdd"
      />
    </n-card>

    <!-- 服务器列表 -->
    <div class="server-list">
      <n-card
        v-for="server in servers"
        :key="server.id"
        class="server-card"
        :bordered="true"
        hoverable
        @click="handleSetActive(server.id)"
        @mouseenter="hoveredServerId = server.id"
        @mouseleave="hoveredServerId = null"
      >
        <div class="server-card-content">
          <div class="server-info">
            <div class="server-name">{{ server.name }}</div>
            <div class="server-url">{{ server.url }}</div>
          </div>
          <div class="server-actions">
            <n-button
              v-show="hoveredServerId === server.id"
              text
              circle
              size="small"
              type="primary"
              class="edit-btn"
              @click="(e) => handleEdit(server, e)"
              title="编辑"
            >
              <template #icon>
                <n-icon :component="EditIcon" />
              </template>
            </n-button>
            <n-button
              v-show="hoveredServerId === server.id"
              text
              circle
              size="small"
              type="error"
              class="delete-btn"
              @click="(e) => handleDelete(server.id, e)"
              title="删除"
            >
              <template #icon>
                <n-icon :component="TrashIcon" />
              </template>
            </n-button>
          </div>
        </div>
      </n-card>
    </div>

    <!-- 编辑模态框 -->
    <n-modal
      v-model:show="showEditModal"
      :mask-closable="false"
      preset="card"
      title="编辑服务器"
      style="max-width: 500px"
    >
      <server-form
        v-model="editFormModel"
        submit-text="保存"
        show-cancel
        :validate-api="validateServerConnection"
        @submit="handleSaveEdit"
        @cancel="handleCloseEdit"
      />
    </n-modal>
  </div>
</template>

<style scoped>
.server-config-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
}

.form-card {
  margin-bottom: 24px;
  border-radius: 8px;
}

.server-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.server-card {
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.server-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.server-card-content {
  position: relative;
  padding: 8px 0;
}

.server-info {
  width: 100%;
  padding-right: 80px; /* 为编辑和删除按钮留出空间 */
}

.server-actions {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 4px;
}

.server-name {
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 4px;
  text-align: center;
  color: var(--n-text-color);
}

.server-url {
  font-size: 14px;
  color: var(--n-text-color-2);
  text-align: center;
  word-break: break-all;
}

.edit-btn,
.delete-btn {
  position: static;
  transform: none;
}
</style>
