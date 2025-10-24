<script setup lang="ts">
import { ref, computed, reactive } from "vue";
import {
  NModal,
  NCard,
  NList,
  NListItem,
  NButton,
  NSpace,
  NIcon,
  NForm,
  NFormItem,
  NInput,
  useDialog,
  useMessage,
} from "naive-ui";
import {
  CheckmarkCircleOutline as CheckIcon,
  Pencil as PencilIcon,
  TrashOutline as TrashIcon,
} from "@vicons/ionicons5";
import { storeToRefs } from "pinia";
import { useApiServerStore } from "@/stores/apiServerStore";
import type { ApiServer } from "@/types/api";

// 控制 Modal 显示
const show = defineModel<boolean>("show", { required: true });

// Store
const apiServerStore = useApiServerStore();
const { servers, activeServer } = storeToRefs(apiServerStore);

// Services
const dialog = useDialog();
const message = useMessage();

// 内部状态
type ViewMode = "list" | "form";
const currentView = ref<ViewMode>("list");
const isEditing = ref(false);

const formInitialState = { id: "", name: "", url: "", token: "" };
const formModel = reactive({ ...formInitialState });

const formRules = {
  name: {
    required: true,
    message: "请输入服务器名称",
    trigger: ["input", "blur"],
  },
  url: {
    required: true,
    message: "请输入服务器地址",
    trigger: ["input", "blur"],
  },
};

const formTitle = computed(() => (isEditing.value ? "编辑服务器" : "添加新服务器"));

// Functions
function switchToListView() {
  currentView.value = "list";
  Object.assign(formModel, formInitialState); // 重置表单
  isEditing.value = false;
}

function handleAddNew() {
  isEditing.value = false;
  Object.assign(formModel, formInitialState);
  currentView.value = "form";
}

function handleEdit(server: ApiServer) {
  isEditing.value = true;
  Object.assign(formModel, server);
  currentView.value = "form";
}

function handleDelete(server: ApiServer) {
  dialog.warning({
    title: "确认删除",
    content: `确定要删除服务器 "${server.name}" 吗？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => {
      apiServerStore.deleteServer(server.id);
      message.success("服务器已删除");
    },
  });
}

function handleSetActive(id: string) {
  apiServerStore.setActiveServer(id);
  message.success("当前服务器已切换");
  show.value = false;
}

function handleFormSubmit() {
  if (isEditing.value) {
    apiServerStore.updateServer(formModel.id, {
      name: formModel.name,
      url: formModel.url,
      token: formModel.token,
    });
    message.success("服务器信息已更新");
  } else {
    apiServerStore.addServer({
      name: formModel.name,
      url: formModel.url,
      token: formModel.token,
    });
    message.success("新服务器已添加");
  }
  switchToListView();
}
</script>

<template>
  <n-modal v-model:show="show" @after-leave="switchToListView">
    <n-card
      style="width: 520px"
      title="服务器管理"
      :bordered="false"
      size="huge"
      role="dialog"
      aria-modal="true"
      title-placement="center"
    >
      <!-- List View -->
      <div v-if="currentView === 'list'">
        <n-list clickable hoverable>
          <n-list-item
            v-for="server in servers"
            :key="server.id"
            @click="handleSetActive(server.id)"
          >
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 4px 0;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 24px; display: flex; align-items: center; justify-content: center;">
                  <n-icon
                    v-if="activeServer?.id === server.id"
                    color="green"
                    size="20"
                    :component="CheckIcon"
                  />
                </div>
                <div>
                  <div style="font-weight: 500;">{{ server.name }}</div>
                  <div style="font-size: 12px; color: #999;">{{ server.url }}</div>
                </div>
              </div>
              <n-space @click.stop>
                <n-button text circle size="small" @click="handleEdit(server)" title="编辑" type="success">
                  <template #icon>
                    <n-icon :component="PencilIcon" />
                  </template>
                </n-button>
                <n-button
                  text
                  circle
                  size="small"
                  type="error"
                  @click="handleDelete(server)"
                  title="删除"
                >
                  <template #icon>
                    <n-icon :component="TrashIcon" />
                  </template>
                </n-button>
              </n-space>
            </div>
          </n-list-item>
        </n-list>
        <n-space justify="end" style="margin-top: 16px">
          <n-button type="success" @click="handleAddNew"> 添加新服务器 </n-button>
        </n-space>
      </div>

      <!-- Form View -->
      <div v-else>
        <h3>{{ formTitle }}</h3>
        <n-form :model="formModel" :rules="formRules" @submit.prevent="handleFormSubmit">
          <n-form-item label="服务器名称" path="name">
            <n-input v-model:value="formModel.name" placeholder="例如：本地开发服务器" />
          </n-form-item>
          <n-form-item label="服务器地址" path="url">
            <n-input v-model:value="formModel.url" placeholder="例如：http://localhost:3000" />
          </n-form-item>
          <n-form-item label="API 密钥（可选）" path="token">
            <n-input v-model:value="formModel.token" placeholder="例如：sk-xxxxxxx" />
          </n-form-item>
          <n-space justify="end">
            <n-button @click="switchToListView">取消</n-button>
            <n-button type="primary" attr-type="submit">保存</n-button>
          </n-space>
        </n-form>
      </div>
    </n-card>
  </n-modal>
</template>
