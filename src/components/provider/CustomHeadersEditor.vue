<script setup lang="ts">
import { ref } from "vue";
import { useMessage } from "naive-ui";

interface HeaderItem {
  key: string;
  value: string;
  isDirty?: boolean;
}

interface Props {
  headers: Record<string, string>;
}

interface Emits {
  update: [headers: Record<string, string>];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const message = useMessage();

// 将对象格式转换为数组，方便编辑
const headerItems = ref<HeaderItem[]>([]);

const toRecord = (items: HeaderItem[]): Record<string, string> => {
  const record: Record<string, string> = {};
  items.forEach(({ key, value }) => {
    if (key.trim() !== "") record[key.trim()] = value;
  });
  return record;
};

// 初始化 headerItems - 只在组件创建时执行一次
const initialize = () => {
  headerItems.value = Object.entries(props.headers || {}).map(([key, value]) => ({
    key,
    value,
    isDirty: false,
  }));
};

initialize();

// 处理输入更新
const markDirtyAndUpdate = (index: number, key: string, value: string) => {
  const item = headerItems.value[index];
  if (!item) return;

  // 直接更新当前项
  headerItems.value[index] = { key, value, isDirty: true };

  // 校验有没有重复 key（只在 key 不为空时校验）
  if (key.trim() !== "") {
    const keys = headerItems.value.map((i) => i.key.trim()).filter((k) => k !== "");
    const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i);
    if (duplicates.length > 0) {
      message.warning(`存在重复的 Header 名称：${duplicates[0]}`);
    }
  }

  // 转换成 record 后发出更新事件
  emit("update", toRecord(headerItems.value));
};

const addHeader = () => {
  headerItems.value.push({ key: "", value: "", isDirty: true });
};

const removeHeader = (index: number) => {
  headerItems.value.splice(index, 1);
  emit("update", toRecord(headerItems.value));
};
</script>

<template>
  <n-form-item label="自定义 Headers">
    <div v-if="headerItems.length === 0" class="no-headers">
      <n-button type="primary" ghost @click="addHeader">添加 Header</n-button>
    </div>

    <div v-else class="headers-container">
      <div v-for="(item, index) in headerItems" :key="index" class="header-item">
        <n-input-group>
          <n-input
            :value="item.key"
            placeholder="Header 名称"
            :status="item.isDirty ? 'warning' : undefined"
            @update:value="(val: string) => markDirtyAndUpdate(index, val, item.value)"
            style="width: 45%; margin-right: 8px"
          />
          <n-input
            :value="item.value"
            placeholder="Header 值"
            :status="item.isDirty ? 'warning' : undefined"
            @update:value="(val: string) => markDirtyAndUpdate(index, item.key, val)"
            style="width: 45%; margin-right: 8px"
          />
          <n-button type="error" ghost @click="removeHeader(index)">删除</n-button>
        </n-input-group>
        <div v-if="item.isDirty" class="key-modified-tag">
          <n-tag type="warning" size="small">已修改</n-tag>
        </div>
      </div>

      <n-button type="primary" ghost @click="addHeader" class="add-header-btn">
        添加 Header
      </n-button>
    </div>
  </n-form-item>
</template>

<style scoped>
.headers-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-item .n-input-group {
  width: 100%;
}

.key-modified-tag {
  align-self: flex-start;
}

.add-header-btn {
  align-self: flex-start;
  margin-top: 8px;
}

.no-headers {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}
</style>
