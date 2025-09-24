/**
 * 时间单位转换工具函数
 * 将微秒转换为适当的单位（微秒、毫秒、秒、分钟）
 */

/**
 * 时间单位转换结果接口
 */
export interface TimeConversionResult {
  value: number;
  unit: string;
  formatted: string;
}

/**
 * 将微秒转换为适当的时间单位
 * @param microseconds 微秒值
 * @returns 转换后的时间对象
 */
export function convertMicroseconds(microseconds: number): TimeConversionResult {
  if (microseconds === 0) {
    return { value: 0, unit: "μs", formatted: "0 μs" };
  }

  // 转换常量（以微秒为基准）
  const MILLISECOND = 1000; // 1 毫秒 = 1000 微秒
  const SECOND = 1000 * MILLISECOND; // 1 秒 = 1000 毫秒 = 1,000,000 微秒
  const MINUTE = 60 * SECOND; // 1 分钟 = 60 秒 = 60,000,000 微秒

  if (microseconds >= MINUTE) {
    const minutes = microseconds / MINUTE;
    return {
      value: minutes,
      unit: "min",
      formatted: `${minutes.toFixed(2)} min`,
    };
  } else if (microseconds >= SECOND) {
    const seconds = microseconds / SECOND;
    return {
      value: seconds,
      unit: "s",
      formatted: `${seconds.toFixed(2)} s`,
    };
  } else if (microseconds >= MILLISECOND) {
    const milliseconds = microseconds / MILLISECOND;
    return {
      value: milliseconds,
      unit: "ms",
      formatted: `${milliseconds.toFixed(2)} ms`,
    };
  } else {
    return {
      value: microseconds,
      unit: "μs",
      formatted: `${microseconds.toFixed(2)} μs`,
    };
  }
}
