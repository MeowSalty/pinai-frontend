import type { RenameRule } from "@/types/rename";

/**
 * 将一系列重命名规则应用于给定的名称。
 * 对规则中的无效正则表达式具有鲁棒性。
 *
 * @param name 原始名称字符串。
 * @param rules 要按顺序应用的重命名规则数组。
 * @param onError 应用规则期间处理错误的可选回调。
 * @returns 应用所有有效规则后的修改名称。
 */
export function applyRulesToName(
  name: string,
  rules: readonly RenameRule[],
  onError?: (error: unknown, rule: RenameRule) => void
): string {
  let newName = name;

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const nameBeforeRule = newName;
    try {
      switch (rule.type) {
        case "insert":
          if (rule.position === "prefix") {
            newName = rule.value + newName;
          } else if (rule.position === "suffix") {
            newName = newName + rule.value;
          } else if (rule.position === "after" && rule.match && newName.includes(rule.match)) {
            newName = newName.replace(new RegExp(rule.match, "g"), `${rule.match}${rule.value}`);
          } else if (rule.position === "before" && rule.match && newName.includes(rule.match)) {
            newName = newName.replace(new RegExp(rule.match, "g"), `${rule.value}${rule.match}`);
          }
          break;

        case "replace":
          if (rule.from) {
            newName = newName.replace(new RegExp(rule.from, "g"), rule.to);
          }
          break;

        case "regex":
          if (rule.pattern) {
            const regex = new RegExp(rule.pattern, "g");
            newName = newName.replace(regex, rule.replace);
          }
          break;

        case "case":
          if (rule.mode === "upper") {
            newName = newName.toUpperCase();
          } else if (rule.mode === "lower") {
            newName = newName.toLowerCase();
          }
          break;
      }
    } catch (error) {
      newName = nameBeforeRule; // 回滚到规则应用前的状态
      if (onError) {
        onError(error, rule);
      } else {
        console.error("应用重命名规则时发生错误：", { rule, error });
      }
    }
  }

  return newName;
}
