import { computed, reactive, ref } from "vue";
import type {
  ApiKeyHealthItem,
  HealthIssueItem,
  HealthSummary,
  ModelHealthItem,
  PlatformHealthItem,
} from "@/types/health";

export interface HealthSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export interface HealthPaginationState {
  page: number;
  pageSize: number;
  itemCount: number;
  showSizePicker: boolean;
  pageSizes: number[];
}

const HEALTH_COLORS = {
  available: "#18a058",
  warning: "#f0a020",
  unavailable: "#d03050",
  unknown: "#909399",
};

let stateInstance: ReturnType<typeof createHealthState> | null = null;

function createHealthState() {
  const healthData = ref<HealthSummary | null>(null);
  const loading = ref(false);

  const platformHealthList = ref<PlatformHealthItem[]>([]);
  const platformListLoading = ref(false);
  const platformPagination = reactive<HealthPaginationState>({
    page: 1,
    pageSize: 8,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50, 100],
  });

  const apiKeyHealthList = ref<ApiKeyHealthItem[]>([]);
  const apiKeyListLoading = ref(false);
  const apiKeyPagination = reactive<HealthPaginationState>({
    page: 1,
    pageSize: 8,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50, 100],
  });

  const modelHealthList = ref<ModelHealthItem[]>([]);
  const modelListLoading = ref(false);
  const modelPagination = reactive<HealthPaginationState>({
    page: 1,
    pageSize: 8,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50, 100],
  });

  const issuesList = ref<HealthIssueItem[]>([]);
  const issuesLoading = ref(false);

  const platformSegments = computed<HealthSegment[]>(() => {
    if (!healthData.value) return [];
    const data = healthData.value.platform;
    return [
      { key: "available", label: "可用", value: data.available, color: HEALTH_COLORS.available },
      { key: "warning", label: "警告", value: data.warning, color: HEALTH_COLORS.warning },
      {
        key: "unavailable",
        label: "不可用",
        value: data.unavailable,
        color: HEALTH_COLORS.unavailable,
      },
      { key: "unknown", label: "未知", value: data.unknown, color: HEALTH_COLORS.unknown },
    ];
  });

  const apiKeySegments = computed<HealthSegment[]>(() => {
    if (!healthData.value) return [];
    const data = healthData.value.api_key;
    return [
      { key: "available", label: "可用", value: data.available, color: HEALTH_COLORS.available },
      { key: "warning", label: "警告", value: data.warning, color: HEALTH_COLORS.warning },
      {
        key: "unavailable",
        label: "不可用",
        value: data.unavailable,
        color: HEALTH_COLORS.unavailable,
      },
      { key: "unknown", label: "未知", value: data.unknown, color: HEALTH_COLORS.unknown },
    ];
  });

  const modelSegments = computed<HealthSegment[]>(() => {
    if (!healthData.value) return [];
    const data = healthData.value.model;
    return [
      { key: "available", label: "可用", value: data.available, color: HEALTH_COLORS.available },
      { key: "warning", label: "警告", value: data.warning, color: HEALTH_COLORS.warning },
      {
        key: "unavailable",
        label: "不可用",
        value: data.unavailable,
        color: HEALTH_COLORS.unavailable,
      },
      { key: "unknown", label: "未知", value: data.unknown, color: HEALTH_COLORS.unknown },
    ];
  });

  return {
    healthData,
    loading,
    platformHealthList,
    platformListLoading,
    platformPagination,
    apiKeyHealthList,
    apiKeyListLoading,
    apiKeyPagination,
    modelHealthList,
    modelListLoading,
    modelPagination,
    issuesList,
    issuesLoading,
    HEALTH_COLORS,
    platformSegments,
    apiKeySegments,
    modelSegments,
  };
}

export function useHealthState() {
  if (!stateInstance) {
    stateInstance = createHealthState();
  }
  return stateInstance;
}
