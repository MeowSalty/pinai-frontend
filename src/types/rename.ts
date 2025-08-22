/**
 * 定义模型自动重命名功能所需的数据结构
 */

/**
 * 规则类型联合类型
 */
export type RuleType = 'insert' | 'replace' | 'regex' | 'case';

/**
 * 基础规则接口，包含所有规则共有的属性
 */
interface BaseRule {
  id: string;
  enabled: boolean;
}

/**
 * 插入规则
 * @property {'insert'} type - 规则类型
 * @property {string} value - 要插入的内容
 * @property {'prefix' | 'suffix' | 'before' | 'after'} position - 插入位置
 * @property {string} [match] - 当 position 为 'before' 或 'after' 时，需要匹配的文本
 */
export interface InsertRule extends BaseRule {
  type: 'insert';
  value: string;
  position: 'prefix' | 'suffix' | 'before' | 'after';
  match?: string;
}

/**
 * 替换规则
 * @property {'replace'} type - 规则类型
 * @property {string} from - 要查找的内容
 * @property {string} to - 要替换成的内容
 */
export interface ReplaceRule extends BaseRule {
  type: 'replace';
  from: string;
  to: string;
}

/**
 * 正则表达式规则
 * @property {'regex'} type - 规则类型
 * @property {string} pattern - 正则表达式
 * @property {string} replace - 替换内容
 */
export interface RegexRule extends BaseRule {
  type: 'regex';
  pattern: string;
  replace: string;
}

/**
 * 大小写规则
 * @property {'case'} type - 规则类型
 * @property {'upper' | 'lower'} mode - 转换模式
 */
export interface CaseRule extends BaseRule {
  type: 'case';
  mode: 'upper' | 'lower';
}

/**
 * 重命名规则联合类型，可以是 InsertRule, ReplaceRule, RegexRule, CaseRule 中的任意一种
 */
export type RenameRule = InsertRule | ReplaceRule | RegexRule | CaseRule;
