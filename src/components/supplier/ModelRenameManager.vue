<script setup lang="ts">
import { VueDraggable } from "vue-draggable-plus";
import { useMessage } from "naive-ui";
import { ReorderFourOutline } from "@vicons/ionicons5";
import { storeToRefs } from "pinia";
import { useRenameRulesStore } from "@/stores/renameRulesStore";
import type { Model } from "@/types/provider";
import { applyRulesToName } from "@/utils/rename";
import type { RenameRule } from "@/types/rename";

// --- Props & Emits ---
const props = defineProps<{
  models: Model[];
}>();

const emit = defineEmits<{
  "update:models": [models: Model[]];
}>();

// --- State ---
const message = useMessage();
const renameRulesStore = useRenameRulesStore();
const { rules } = storeToRefs(renameRulesStore);
const { addRule, removeRule } = renameRulesStore;

// --- UI Configuration ---
const caseOptions = [
  { label: "转换为大写", value: "upper" },
  { label: "转换为小写", value: "lower" },
];

const insertPositionOptions = [
  { label: "作为前缀", value: "prefix" },
  { label: "作为后缀", value: "suffix" },
  { label: "在文本后", value: "after" },
  { label: "在文本前", value: "before" },
];

const addRuleOptions = [
  { label: "添加插入规则", key: "insert" },
  { label: "添加替换规则", key: "replace" },
  { label: "添加正则规则", key: "regex" },
  { label: "添加大小写规则", key: "case" },
];

// --- Methods ---
const handleExecuteRules = () => {
  const updatedModels = JSON.parse(JSON.stringify(props.models)) as Model[];
  let updatedCount = 0;

  const handleError = (error: unknown, rule: RenameRule) => {
    if (error instanceof SyntaxError && "pattern" in rule) {
      message.error(`正则表达式 "${rule.pattern}" 无效，已跳过。`);
    } else {
      message.error("应用规则时发生未知错误。");
    }
  };

  updatedModels.forEach((model) => {
    const newName = applyRulesToName(model.name, rules.value, handleError);

    // 只有当新名称既不是原始名称也不是旧的别名时才标记为脏数据
    if (newName !== model.name && newName !== model.alias) {
      model.alias = newName;
      model.isDirty = true; // 标记为脏数据
      updatedCount++;
    }
  });

  emit("update:models", updatedModels);
  message.success(`已成功应用重命名规则，${updatedCount} 个模型的别名已更新。`);
};
</script>

<template>
  <div>
    <n-space style="margin-bottom: 16px">
      <n-dropdown trigger="click" :options="addRuleOptions" @select="addRule">
        <n-button type="primary">添加规则</n-button>
      </n-dropdown>
      <n-button type="success" @click="handleExecuteRules">执行规则</n-button>
    </n-space>

    <VueDraggable v-model="rules" :animation="150" handle=".drag-handle" class="rule-list">
      <div v-for="rule in rules" :key="rule.id" class="rule-item">
        <n-space align="center" class="rule-content">
          <n-icon class="drag-handle" size="20"><ReorderFourOutline /></n-icon>
          <n-checkbox v-model:checked="rule.enabled" />

          <!-- Rule Configuration -->
          <n-space align="center" :wrap="false">
            <!-- Insert Rule -->
            <template v-if="rule.type === 'insert'">
              <span>插入</span>
              <n-input v-model:value="rule.value" placeholder="内容" style="width: 150px" />
              <n-select
                v-model:value="rule.position"
                :options="insertPositionOptions"
                style="width: 120px"
              />
              <n-input
                v-if="rule.position === 'after' || rule.position === 'before'"
                v-model:value="rule.match"
                placeholder="匹配文本"
                style="width: 150px"
              />
            </template>

            <!-- Replace Rule -->
            <template v-if="rule.type === 'replace'">
              <span>将</span>
              <n-input v-model:value="rule.from" placeholder="查找" style="width: 150px" />
              <span>替换为</span>
              <n-input v-model:value="rule.to" placeholder="替换" style="width: 150px" />
            </template>

            <!-- Regex Rule -->
            <template v-if="rule.type === 'regex'">
              <span>匹配正则</span>
              <n-input v-model:value="rule.pattern" placeholder="表达式" style="width: 200px" />
              <span>替换为</span>
              <n-input v-model:value="rule.replace" placeholder="替换内容" style="width: 150px" />
            </template>

            <!-- Case Rule -->
            <template v-if="rule.type === 'case'">
              <span>将文本</span>
              <n-select v-model:value="rule.mode" :options="caseOptions" style="width: 150px" />
            </template>
          </n-space>

          <n-button type="error" ghost size="small" @click="removeRule(rule.id)">删除</n-button>
        </n-space>
      </div>
    </VueDraggable>
  </div>
</template>

<style scoped>
.rule-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rule-item {
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 4px;
  background-color: #fafafa;
  transition: background-color 0.3s;
}

.rule-item:hover {
  background-color: #f5f5f5;
}

.rule-content {
  width: 100%;
}

.drag-handle {
  cursor: grab;
  color: #999;
}

.drag-handle:active {
  cursor: grabbing;
}
</style>
