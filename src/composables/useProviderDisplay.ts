import { computed } from 'vue'
import type { Endpoint, PlatformWithHealth, ResourceHealthCount } from '@/types/provider'
import { HealthStatus } from '@/types/health'
import { useThemeStore } from '@/stores/themeStore'
import { ALLOWED_PROVIDERS, DEFAULT_VARIANTS } from '@/composables/providerBatchImport/constants'
import { buildEndpoints } from '@/composables/providerBatchImport/endpoints'

interface TagColor {
  color: string
  textColor: string
  borderColor: string
}

export interface ProviderTypeTag {
  label: string
  color?: TagColor
}

const MIN_HUE_DISTANCE = 18
const MAX_HUE_ATTEMPTS = 12
const hueCache = new Map<string, number>()
const assignedHues = new Set<number>()

const hashString = (text: string) => {
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }
  return hash
}

const hueDistance = (a: number, b: number) => {
  const diff = Math.abs(a - b) % 360
  return Math.min(diff, 360 - diff)
}

const normalizePath = (path: string) => path.trim().replace(/^\/+|\/+$/g, '')

const getEndpointSignature = (
  endpoint: Pick<Endpoint, 'endpoint_type' | 'endpoint_variant' | 'path'>,
) => `${endpoint.endpoint_type}::${endpoint.endpoint_variant}::${normalizePath(endpoint.path)}`

const getEndpointsSignature = (endpoints: Endpoint[]) =>
  endpoints.map(getEndpointSignature).sort().join('||')

const QUICK_TYPE_SIGNATURE_MAP = (() => {
  const map = new Map<string, string>()

  for (const providerName of ALLOWED_PROVIDERS) {
    const defaultVariant = DEFAULT_VARIANTS[providerName] || ''
    const endpoints = buildEndpoints(providerName, defaultVariant)
    map.set(getEndpointsSignature(endpoints), providerName)
  }

  // OpenAI 在快捷导入中允许空 variant，对应 2 个端点（chat_completions + responses）
  map.set(getEndpointsSignature(buildEndpoints('OpenAI', '')), 'OpenAI')

  return map
})()

const STATUS_META = {
  [HealthStatus.Unknown]: { text: '未知', type: 'default' as const },
  [HealthStatus.Available]: { text: '可用', type: 'success' as const },
  [HealthStatus.Warning]: { text: '警告', type: 'warning' as const },
  [HealthStatus.Unavailable]: { text: '禁用', type: 'error' as const },
}

export const useProviderDisplay = () => {
  const themeStore = useThemeStore()
  const isDark = computed(() => themeStore.isDark)

  const formatVariantLabel = (text: string) =>
    text
      .split('_')
      .map((word) => {
        if (!word) return ''
        const head = word.slice(0, 1).toUpperCase()
        const tail = word.slice(1).toLowerCase()
        return head + tail
      })
      .join(' ')

  const getHueForText = (text: string) => {
    const cached = hueCache.get(text)
    if (cached !== undefined) return cached

    let attempt = 0
    let hue = Math.abs(hashString(text)) % 360
    while (attempt < MAX_HUE_ATTEMPTS) {
      let isTooClose = false
      for (const usedHue of assignedHues) {
        if (hueDistance(hue, usedHue) < MIN_HUE_DISTANCE) {
          isTooClose = true
          break
        }
      }
      if (!isTooClose) break

      attempt += 1
      const salted = `${text}:${attempt}`
      hue = Math.abs(hashString(salted)) % 360
    }

    hueCache.set(text, hue)
    assignedHues.add(hue)
    return hue
  }

  const getTagColor = (text: string) => {
    const hue = getHueForText(formatVariantLabel(text))
    const backgroundLightness = isDark.value ? 28 : 92
    const textLightness = isDark.value ? 88 : 32
    const borderLightness = isDark.value ? 45 : 75
    const color = `hsl(${hue}, 70%, ${backgroundLightness}%)`
    const textColor = `hsl(${hue}, 70%, ${textLightness}%)`
    const borderColor = `hsl(${hue}, 70%, ${borderLightness}%)`
    return { color, textColor, borderColor }
  }

  const getQuickTypeName = (endpoints: Endpoint[]) => {
    if (endpoints.length === 0) return null
    return QUICK_TYPE_SIGNATURE_MAP.get(getEndpointsSignature(endpoints)) || null
  }

  const getProviderTypeTags = (provider: PlatformWithHealth): ProviderTypeTag[] => {
    const endpoints = provider.endpoints || []
    if (endpoints.length === 0) {
      return [{ label: '未配置' }]
    }

    const quickTypeName = getQuickTypeName(endpoints)
    if (quickTypeName) {
      return [{ label: quickTypeName, color: getTagColor(quickTypeName) }]
    }

    if (endpoints.length > 1) {
      return [{ label: '多端点', color: getTagColor('多端点') }]
    }

    const endpoint = endpoints[0]
    if (!endpoint) {
      return [{ label: '未配置' }]
    }

    return [
      {
        label: formatVariantLabel(endpoint.endpoint_type),
        color: getTagColor(endpoint.endpoint_type),
      },
      {
        label: formatVariantLabel(endpoint.endpoint_variant),
        color: getTagColor(endpoint.endpoint_variant),
      },
    ]
  }

  const getStatusMeta = (status?: HealthStatus) => {
    return STATUS_META[status ?? HealthStatus.Unknown]
  }

  const getUnavailablePercentage = (
    healthCount: ResourceHealthCount | undefined,
    totalCount: number,
  ) => {
    if (!healthCount || totalCount <= 0) return 0
    const rawPercentage = Math.round((healthCount.unavailable / totalCount) * 100)
    return Math.min(100, Math.max(0, rawPercentage))
  }

  return {
    formatVariantLabel,
    getProviderTypeTags,
    getStatusMeta,
    getTagColor,
    getUnavailablePercentage,
  }
}
