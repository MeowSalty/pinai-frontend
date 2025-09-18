/**
 * 生成 UUID v4 字符串的兼容函数
 * 解决 crypto.randomUUID 在某些环境下不可用的问题
 * 
 * @returns UUID v4 字符串
 */
export function generateUUID(): string {
  // 检查 crypto.randomUUID 是否可用
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // 降级方案：手动实现 UUID v4 生成
  // 参考 RFC 4122 标准
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}