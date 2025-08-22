<script setup lang="ts">
import { h, onMounted, ref, computed } from "vue";
import { storeToRefs } from "pinia";
import type { DataTableColumns } from "naive-ui";
import { NButton, NSpace, useMessage, useDialog, NSelect } from "naive-ui";
import { useSupplierStore } from "@/stores/supplierStore";
import { useApiServerStore } from "@/stores/apiServerStore";
import type { Provider } from "@/types/supplier";
import type { ApiError } from "@/types/api";

defineOptions({
  name: "SupplierPage",
});

const store = useSupplierStore();
const { suppliers, isLoading, currentSupplier, isFetchingModels } = storeToRefs(store);
const apiServerStore = useApiServerStore();
const { activeServer } = storeToRefs(apiServerStore);
const message = useMessage();
const dialog = useDialog();

const showModal = ref(false);
const formMode = ref<"add" | "edit">("add");
const showRenameModal = ref(false);

const apiFormatOptions = [
  { label: "OpenAI", value: "OpenAI" },
  { label: "Cohere", value: "Cohere" },
];

onMounted(async () => {
  // 检查是否选择了服务器
  if (!activeServer.value) {
    message.warning("请先选择一个 API 服务器");
    return;
  }

  try {
    await store.fetchSuppliers();
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.isTimeout) {
      message.error("加载供应商数据失败：请求超时，请检查网络连接");
    } else if (apiError.status && apiError.status >= 500) {
      message.error("加载供应商数据失败：服务器内部错误，请稍后重试");
    } else if (apiError.status && apiError.status >= 400) {
      message.error("加载供应商数据失败：请求参数错误，请检查后重试");
    } else if (error instanceof Error) {
      message.error("加载供应商数据失败：" + error.message);
    } else {
      message.error("加载供应商数据失败：未知错误");
    }
  }
});

const handleAdd = () => {
  store.initNewSupplier();
  formMode.value = "add";
  showModal.value = true;
};

const handleEdit = async (row: Provider) => {
  // 检查是否选择了服务器
  if (!activeServer.value) {
    message.warning("请先选择一个 API 服务器");
    return;
  }

  try {
    await store.loadSupplierForEdit(row.id);
    // 紧接着获取该供应商已保存的模型列表
    await store.fetchModelsByProviderId(row.id);
    formMode.value = "edit";
    showModal.value = true;
  } catch (error) {
    console.error("加载供应商编辑数据失败：", error);
    const apiError = error as ApiError;
    if (apiError.isTimeout) {
      message.error("加载供应商编辑数据失败：请求超时，请检查网络连接");
    } else if (apiError.status && apiError.status >= 500) {
      message.error("加载供应商编辑数据失败：服务器内部错误，请稍后重试");
    } else if (apiError.status && apiError.status >= 400) {
      message.error("加载供应商编辑数据失败：请求参数错误，请检查后重试");
    } else if (error instanceof Error) {
      message.error("加载供应商编辑数据失败：" + error.message);
    } else {
      message.error("加载供应商编辑数据失败：未知错误");
    }
  }
};

const handleDelete = (id: number) => {
  dialog.warning({
    title: "确认删除",
    content: "您确定要删除这个供应商吗？此操作不可撤销。",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        await store.deleteSupplier(id);
        message.success("供应商已删除");
      } catch (error) {
        const apiError = error as ApiError;
        if (apiError.isTimeout) {
          message.error("删除供应商失败：请求超时，请检查网络连接");
        } else if (apiError.status === 404) {
          message.error("删除供应商失败：请求的资源不存在");
        } else if (apiError.status && apiError.status >= 500) {
          message.error("删除供应商失败：服务器内部错误，请稍后重试");
        } else if (apiError.status && apiError.status >= 400) {
          message.error("删除供应商失败：请求参数错误，请检查权限或参数");
        } else {
          message.error("删除供应商失败：未知错误");
        }
      }
    },
  });
};

const handleSubmit = async () => {
  if (!currentSupplier.value) return;

  // 检查是否选择了服务器
  if (!activeServer.value) {
    message.warning("请先选择一个 API 服务器");
    return;
  }

  try {
    if (formMode.value === "add") {
      // 创建时，需要移除 model 中的 id
      const createPayload = JSON.parse(JSON.stringify(currentSupplier.value));
      createPayload.models = createPayload.models.map((m: { id: number }) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = m;
        return rest;
      });
      await store.createSupplier(createPayload);
    } else {
      // 更新时，直接使用 currentSupplier
      await store.updateSupplier(currentSupplier.value);
    }
    message.success(formMode.value === "add" ? "添加成功" : "修改成功");
    showModal.value = false;
  } catch (error) {
    console.error("提交供应商数据失败：", error);
    const apiError = error as ApiError;
    if (apiError.isTimeout) {
      message.error(
        `${formMode.value === "add" ? "添加" : "更新"}供应商失败：请求超时，请检查网络连接`
      );
    } else if (apiError.status === 409) {
      message.error(
        `${
          formMode.value === "add" ? "添加" : "更新"
        }供应商失败：数据冲突，请检查供应商名称是否重复`
      );
    } else if (apiError.status === 404) {
      message.error(`${formMode.value === "add" ? "添加" : "更新"}供应商失败：请求的资源不存在`);
    } else if (apiError.status && apiError.status >= 500) {
      message.error(
        `${formMode.value === "add" ? "添加" : "更新"}供应商失败：服务器内部错误，请稍后重试`
      );
    } else if (apiError.status && apiError.status >= 400) {
      message.error(
        `${formMode.value === "add" ? "添加" : "更新"}供应商失败：请求参数错误，请检查输入参数`
      );
    } else if (error instanceof Error) {
      message.error(`${formMode.value === "add" ? "添加" : "更新"}供应商失败：` + error.message);
    } else {
      message.error(`${formMode.value === "add" ? "添加" : "更新"}供应商失败：未知错误`);
    }
  }
};

const removeModel = (index: number) => {
  if (currentSupplier.value) {
    currentSupplier.value.models.splice(index, 1);
  }
};

const addModelRow = () => {
  if (currentSupplier.value) {
    currentSupplier.value.models.push({
      id: -1, // 临时 ID
      name: "",
      alias: "",
      isDirty: true, // 新模型默认需要保存
    });
  }
};

const isFetchModelsDisabled = computed(() => {
  if (!currentSupplier.value) return true;
  const { platform, apiKey } = currentSupplier.value;
  return !platform.format || !platform.base_url || !apiKey.value;
});

const handleFetchModels = async () => {
  // 检查是否选择了服务器
  if (!activeServer.value) {
    message.warning("请先选择一个 API 服务器");
    return;
  }

  if (!currentSupplier.value) {
    message.error("获取模型失败：当前供应商信息为空");
    return;
  }

  try {
    await store.fetchModelsFromProvider();
    message.success("模型获取成功");
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.isTimeout) {
      message.error("获取模型失败：请求超时，请检查网络连接和供应商配置");
    } else if (apiError.status === 401) {
      message.error("获取模型失败：API 密钥无效或权限不足，请检查 API 密钥");
    } else if (apiError.status === 404) {
      message.error("获取模型失败：无法连接到供应商，请检查 API 端点地址是否正确");
    } else if (apiError.status && apiError.status >= 500) {
      message.error("获取模型失败：供应商服务器内部错误，请稍后重试");
    } else if (apiError.status && apiError.status >= 400) {
      // 尝试解析 body 获取更详细的错误信息
      let detail = `请检查 API 密钥和基础 URL 配置`;
      if (apiError.body) {
        try {
          const body = JSON.parse(apiError.body);
          if (body.error && body.error.message) {
            detail = body.error.message;
          }
        } catch {
          // 如果 body 不是 JSON，直接使用原始 body
          detail = apiError.body ?? "";
        }
      }
      message.error(`获取模型失败 (${apiError.status})：${detail}`);
    } else if (error instanceof Error) {
      message.error(`获取模型失败：${error.message}`);
    } else {
      message.error("获取模型失败：发生未知错误");
    }
  }
};

const createColumns = (): DataTableColumns<Provider> => [
  {
    title: "名称",
    key: "name",
  },
  {
    title: "API 类型",
    key: "format",
  },
  {
    title: "API 端点",
    key: "base_url",
  },
  {
    title: "操作",
    key: "actions",
    render(row) {
      return h(
        NSpace,
        {},
        {
          default: () => [
            h(
              NButton,
              {
                quaternary: true,
                size: "small",
                onClick: () => handleEdit(row),
              },
              { default: () => "修改" }
            ),
            h(
              NButton,
              {
                quaternary: true,
                size: "small",
                type: "error",
                onClick: () => handleDelete(row.id),
              },
              { default: () => "删除" }
            ),
          ],
        }
      );
    },
  },
];

const columns = createColumns();
</script>

<template>
  <n-card title="供应商管理">
    <template #header-extra>
      <n-button type="primary" @click="handleAdd">添加供应商</n-button>
    </template>
    <n-data-table
      :columns="columns"
      :data="suppliers"
      :loading="isLoading"
      :bordered="false"
      :single-line="false"
    />
  </n-card>

  <n-modal
    v-model:show="showRenameModal"
    preset="card"
    style="width: 800px; max-height: 80vh"
    title="模型自动重命名"
    content-style="overflow: auto;"
  >
    <ModelRenameManager
      v-if="currentSupplier"
      :models="currentSupplier.models"
      @update:models="currentSupplier.models = $event"
    />
  </n-modal>

  <n-modal v-model:show="showModal" preset="card" style="width: 600px">
    <n-card :title="formMode === 'add' ? '添加供应商' : '修改供应商'">
      <n-form v-if="currentSupplier" :model="currentSupplier">
        <n-form-item label="供应商名称" path="platform.name">
          <n-input v-model:value="currentSupplier.platform.name" />
        </n-form-item>
        <n-form-item label="API 类型" path="platform.format">
          <n-select v-model:value="currentSupplier.platform.format" :options="apiFormatOptions" />
        </n-form-item>
        <n-form-item label="API 端点" path="platform.base_url">
          <n-input v-model:value="currentSupplier.platform.base_url" />
        </n-form-item>
        <n-form-item label="API 密钥" path="apiKey.value">
          <n-input
            v-model:value="currentSupplier.apiKey.value"
            type="password"
            show-password-on="click"
            placeholder="如需修改请填写新密钥"
          />
        </n-form-item>

        <n-h4>模型列表</n-h4>
        <n-space style="margin-bottom: 16px">
          <n-button @click="addModelRow"> 添加模型 </n-button>
          <n-button
            @click="handleFetchModels"
            :loading="isFetchingModels"
            :disabled="isFetchModelsDisabled"
          >
            获取模型
          </n-button>
          <n-button @click="showRenameModal = true">自动重命名</n-button>
        </n-space>
        <n-space
          v-for="(model, index) in currentSupplier.models"
          :key="index"
          style="margin-bottom: 8px"
        >
          <n-input
            v-model:value="model.name"
            placeholder="名称"
            :status="model.isDirty ? 'warning' : undefined"
            @update:value="model.isDirty = true"
          />
          <n-input
            v-model:value="model.alias"
            placeholder="别名"
            :status="model.isDirty ? 'warning' : undefined"
            @update:value="model.isDirty = true"
          />
          <n-button type="error" ghost @click="removeModel(index)">删除</n-button>
        </n-space>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" :loading="isLoading" @click="handleSubmit">
            {{ formMode === "add" ? "创建" : "保存" }}
          </n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>
