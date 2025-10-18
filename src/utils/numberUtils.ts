/**
 * 格式化 Token 数量
 * @param tokens Token 数量
 * @returns 格式化后的字符串
 */
export function formatTokens(tokens?: number): string {
  if (tokens === undefined || tokens === null) {
    return "-";
  }
  if (tokens < 1000) {
    return tokens.toString();
  }
  if (tokens < 1_000_000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return `${(tokens / 1_000_000).toFixed(1)}M`;
}
