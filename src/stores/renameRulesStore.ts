import { ref, watch } from 'vue';
import { defineStore } from 'pinia';
import type { RenameRule } from '@/types/rename';

const STORAGE_KEY = 'pinai-rename-rules';

const defaultRules: RenameRule[] = [
  { id: crypto.randomUUID(), type: 'insert', enabled: true, position: 'prefix', value: 'CN-' },
  { id: crypto.randomUUID(), type: 'replace', enabled: true, from: '_', to: '-' },
  { id: crypto.randomUUID(), type: 'case', enabled: false, mode: 'upper' },
];

export const useRenameRulesStore = defineStore('renameRules', () => {
  const rules = ref<RenameRule[]>([]);

  const loadRules = () => {
    try {
      const storedRules = localStorage.getItem(STORAGE_KEY);
      if (storedRules) {
        rules.value = JSON.parse(storedRules);
      } else {
        rules.value = defaultRules;
      }
    } catch (error) {
      console.error('Failed to load or parse rename rules from localStorage:', error);
      rules.value = defaultRules;
    }
  };

  const saveRules = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rules.value));
    } catch (error) {
      console.error('Failed to save rename rules to localStorage:', error);
    }
  };

  const addRule = (type: RenameRule['type']) => {
    let newRule: RenameRule;
    const base = { id: crypto.randomUUID(), enabled: true };

    switch (type) {
      case 'insert':
        newRule = { ...base, type, position: 'prefix', value: '' };
        break;
      case 'replace':
        newRule = { ...base, type, from: '', to: '' };
        break;
      case 'regex':
        newRule = { ...base, type, pattern: '', replace: '' };
        break;
      case 'case':
        newRule = { ...base, type, mode: 'upper' };
        break;
    }
    rules.value.push(newRule);
  };

  const removeRule = (id: string) => {
    rules.value = rules.value.filter(rule => rule.id !== id);
  };

  // Initial load
  loadRules();

  // Watch for changes and save
  watch(rules, saveRules, { deep: true });

  return {
    rules,
    loadRules,
    addRule,
    removeRule,
  };
});
