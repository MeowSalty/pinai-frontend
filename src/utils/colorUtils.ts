function clamp01(value: number): number {
  if (value <= 0) {
    return 0
  }
  if (value >= 1) {
    return 1
  }
  return value
}

function parseHexColor(color: string): [number, number, number] {
  const normalized = color.trim().replace('#', '')
  if (!/^[\da-fA-F]{6}$/.test(normalized)) {
    throw new Error(`Invalid hex color: ${color}`)
  }

  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ]
}

function toHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0')
}

// 十六进制颜色线性插值
export function lerpColor(a: string, b: string, t: number): string {
  const ratio = clamp01(t)
  const [ar, ag, ab] = parseHexColor(a)
  const [br, bg, bb] = parseHexColor(b)

  const r = ar + (br - ar) * ratio
  const g = ag + (bg - ag) * ratio
  const bValue = ab + (bb - ab) * ratio

  return `#${toHex(r)}${toHex(g)}${toHex(bValue)}`
}

// 根据失败率获取颜色（0~1 范围）
export function getFailureColor(failureRate: number): string {
  const rate = clamp01(failureRate)

  if (rate <= 0.1) {
    const t = rate / 0.1
    return lerpColor('#18a058', '#f0a020', t)
  }

  if (rate <= 0.3) {
    const t = (rate - 0.1) / 0.1
    return lerpColor('#f0a020', '#d03050', t)
  }

  return '#d03050'
}
