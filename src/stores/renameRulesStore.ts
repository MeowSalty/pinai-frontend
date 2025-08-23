import { ref, watch } from "vue";
import { defineStore } from "pinia";
import type { RenameRule } from "@/types/rename";

const STORAGE_KEY = "pinai-rename-rules";

// 默认规则
const defaultRules: RenameRule[] = [
  // 将所有字符转为小写
  { id: crypto.randomUUID(), type: "case", enabled: true, mode: "lower" },
  // 去除分组标识
  { id: crypto.randomUUID(), type: "regex", enabled: true, pattern: ".*\\/", replace: "" },
  { id: crypto.randomUUID(), type: "regex", enabled: true, pattern: ":.*", replace: "" },
  { id: crypto.randomUUID(), type: "regex", enabled: true, pattern: "\\(.*\\)", replace: "" },
  // 把一个或多个空格或下划线替换为-
  { id: crypto.randomUUID(), type: "regex", enabled: true, pattern: "[\\s_]+", replace: "-" },
  // 去除日期数字
  { id: crypto.randomUUID(), type: "regex", enabled: true, pattern: "-\\d{4,}", replace: "" },
];

export const useRenameRulesStore = defineStore("renameRules", () => {
  const rules = ref<RenameRule[]>([]);

  // 加载规则
  const loadRules = () => {
    try {
      const storedRules = localStorage.getItem(STORAGE_KEY);
      if (storedRules) {
        rules.value = JSON.parse(storedRules);
      } else {
        rules.value = defaultRules;
      }
    } catch (error) {
      console.error("从 localStorage 加载或解析重命名规则失败：", error);
      rules.value = defaultRules;
    }
  };

  // 保存规则
  const saveRules = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rules.value));
    } catch (error) {
      console.error("保存重命名规则到 localStorage 失败：", error);
    }
  };

  // 添加规则
  const addRule = (type: RenameRule["type"]) => {
    let newRule: RenameRule;
    const base = { id: crypto.randomUUID(), enabled: true };

    switch (type) {
      case "insert":
        newRule = { ...base, type, position: "prefix", value: "" };
        break;
      case "replace":
        newRule = { ...base, type, from: "", to: "" };
        break;
      case "regex":
        newRule = { ...base, type, pattern: "", replace: "" };
        break;
      case "case":
        newRule = { ...base, type, mode: "upper" };
        break;
    }
    rules.value.push(newRule);
  };

  // 删除规则
  const removeRule = (id: string) => {
    rules.value = rules.value.filter((rule) => rule.id !== id);
  };

  // 初始加载
  loadRules();

  // 监听变化并保存
  watch(rules, saveRules, { deep: true });

  return {
    rules,
    loadRules,
    addRule,
    removeRule,
  };
});
