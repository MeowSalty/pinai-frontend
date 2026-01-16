import { h } from "vue";
import { NButton, NEllipsis, NFlex, NIcon, NTag, NText, type DataTableColumns } from "naive-ui";
import { CheckmarkCircle, CloseCircle, RefreshCircle } from "@vicons/ionicons5";
import type {
  ApiKeyHealthItem,
  HealthIssueItem,
  ModelHealthItem,
  PlatformHealthItem,
} from "@/types/health";
import { HealthResourceType, HealthStatus } from "@/types/health";

interface PlatformColumnHandlers {
  onEnablePlatform: (platformId: number) => void;
}

interface ApiKeyColumnHandlers {
  onEnableApiKey: (keyId: number) => void;
}

interface ModelColumnHandlers {
  onEnableModel: (modelId: number) => void;
}

interface IssueColumnHandlers {
  onRecoverIssue: (item: HealthIssueItem) => void;
}

const renderStatusTag = (status: HealthStatus) => {
  const statusMap = {
    [HealthStatus.Unknown]: { text: "未知", type: "default" as const },
    [HealthStatus.Available]: { text: "可用", type: "success" as const },
    [HealthStatus.Warning]: { text: "警告", type: "warning" as const },
    [HealthStatus.Unavailable]: { text: "禁用", type: "error" as const },
  };
  const config = statusMap[status];
  return h(NTag, { type: config.type, size: "small" }, { default: () => config.text });
};

const getResourceTypeConfig = (resourceType: HealthResourceType) => {
  const typeMap = {
    [HealthResourceType.Platform]: { text: "平台", type: "warning" as const },
    [HealthResourceType.APIKey]: { text: "密钥", type: "info" as const },
    [HealthResourceType.Model]: { text: "模型", type: "success" as const },
  };
  return typeMap[resourceType];
};

const renderDateTime = (dateString: string) => {
  const date = new Date(dateString);
  const timeStr = date.toLocaleTimeString("zh-CN", { hour12: false });
  const dateStr = date.toLocaleDateString("zh-CN");
  return h(NFlex, { vertical: true, size: 0 }, [
    h(NText, { strong: true }, timeStr),
    h(NText, { depth: 3 }, dateStr),
  ]);
};

export const createPlatformColumns = (
  handlers: PlatformColumnHandlers
): DataTableColumns<PlatformHealthItem> => [
  {
    title: "平台",
    key: "platform",
    render(row) {
      return h(NText, {}, row.platform_name);
    },
  },
  { title: "状态", key: "status", width: 60, render: (row) => renderStatusTag(row.status) },
  {
    title: "统计 (S/E/R)",
    key: "stats",
    render(row) {
      return h(NFlex, [
        h(NFlex, { size: 4, align: "center" }, [
          h(NIcon, { size: 18, color: "#18a058", component: CheckmarkCircle }),
          h(NText, { type: "success" }, row.success_count.toLocaleString()),
        ]),
        h(NFlex, { size: 4, align: "center" }, [
          h(NIcon, { size: 18, color: "#d03050", component: CloseCircle }),
          h(NText, { type: "success" }, row.error_count.toLocaleString()),
        ]),
        h(NFlex, { size: 4, align: "center" }, [
          h(NIcon, { size: 18, color: "#f0a020", component: RefreshCircle }),
          h(NText, { type: "success" }, row.retry_count.toLocaleString()),
        ]),
      ]);
    },
  },
  { title: "最后错误", key: "last_error", ellipsis: { tooltip: true } },
  {
    title: "最后检查",
    key: "last_check_at",
    width: 110,
    render(row) {
      return renderDateTime(row.last_check_at);
    },
  },
  {
    title: "操作",
    key: "actions",
    width: 80,
    render(row) {
      return h(
        NButton,
        {
          size: "small",
          onClick: () => handlers.onEnablePlatform(row.platform_id),
          strong: true,
          secondary: true,
          type: "primary",
          disabled: row.status === HealthStatus.Available,
        },
        {
          default: () => {
            switch (row.status) {
              case HealthStatus.Unavailable:
                return "启用";
              default:
                return "重置";
            }
          },
        }
      );
    },
  },
];

export const createApiKeyColumns = (
  handlers: ApiKeyColumnHandlers
): DataTableColumns<ApiKeyHealthItem> => [
  {
    title: "密钥",
    key: "key_value",
    ellipsis: {
      tooltip: true,
    },
  },
  { title: "状态", key: "status", width: 60, render: (row) => renderStatusTag(row.status) },
  {
    title: "统计 (S/E/R)",
    key: "stats",
    render(row) {
      return h(NFlex, [
        h(NFlex, { size: 4, align: "center" }, [
          h(NIcon, { size: 18, color: "#18a058", component: CheckmarkCircle }),
          h(NText, { type: "success" }, row.success_count.toLocaleString()),
        ]),
        h(NFlex, { size: 4, align: "center" }, [
          h(NIcon, { size: 18, color: "#d03050", component: CloseCircle }),
          h(NText, { type: "success" }, row.error_count.toLocaleString()),
        ]),
        h(NFlex, { size: 4, align: "center" }, [
          h(NIcon, { size: 18, color: "#f0a020", component: RefreshCircle }),
          h(NText, { type: "success" }, row.retry_count.toLocaleString()),
        ]),
      ]);
    },
  },
  { title: "最后错误", key: "last_error", ellipsis: { tooltip: true } },
  {
    title: "最后检查",
    key: "last_check_at",
    width: 110,
    render(row) {
      return renderDateTime(row.last_check_at);
    },
  },
  {
    title: "操作",
    key: "actions",
    width: 80,
    render(row) {
      return h(
        NButton,
        {
          size: "small",
          onClick: () => handlers.onEnableApiKey(row.key_id),
          strong: true,
          secondary: true,
          type: "primary",
          disabled: row.status === HealthStatus.Available,
        },
        {
          default: () => {
            switch (row.status) {
              case HealthStatus.Unavailable:
                return "启用";
              default:
                return "重置";
            }
          },
        }
      );
    },
  },
];

export const createModelColumns = (
  handlers: ModelColumnHandlers
): DataTableColumns<ModelHealthItem> => [
  {
    title: "模型",
    key: "model",
    render(row) {
      if (row.model_alias) {
        return h(NFlex, { vertical: true, size: 0 }, [
          h(NText, { strong: true }, row.model_alias),
          h(NText, { depth: 3 }, row.model_name),
        ]);
      }
      return h(NText, {}, row.model_name);
    },
  },
  { title: "状态", key: "status", width: 60, render: (row) => renderStatusTag(row.status) },
  {
    title: "统计 (S/E/R)",
    key: "stats",
    render(row) {
      return h(NFlex, [
        h(NFlex, { size: 4, align: "center" }, [
          h(NIcon, { size: 18, color: "#18a058", component: CheckmarkCircle }),
          h(NText, { type: "success" }, row.success_count.toLocaleString()),
        ]),
        h(NFlex, { size: 4, align: "center" }, [
          h(NIcon, { size: 18, color: "#d03050", component: CloseCircle }),
          h(NText, { type: "success" }, row.error_count.toLocaleString()),
        ]),
        h(NFlex, { size: 4, align: "center" }, [
          h(NIcon, { size: 18, color: "#f0a020", component: RefreshCircle }),
          h(NText, { type: "success" }, row.retry_count.toLocaleString()),
        ]),
      ]);
    },
  },
  { title: "最后错误", key: "last_error", ellipsis: { tooltip: true } },
  {
    title: "最后检查",
    key: "last_check_at",
    width: 110,
    render(row) {
      return renderDateTime(row.last_check_at);
    },
  },
  {
    title: "操作",
    key: "actions",
    width: 80,
    render(row) {
      return h(
        NButton,
        {
          size: "small",
          onClick: () => handlers.onEnableModel(row.model_id),
          strong: true,
          secondary: true,
          type: "primary",
          disabled: row.status === HealthStatus.Available,
        },
        {
          default: () => {
            switch (row.status) {
              case HealthStatus.Unavailable:
                return "启用";
              default:
                return "重置";
            }
          },
        }
      );
    },
  },
];

export const createIssueColumns = (
  handlers: IssueColumnHandlers
): DataTableColumns<HealthIssueItem> => [
  {
    title: "类型",
    key: "resource_type",
    width: 80,
    render(row) {
      const config = getResourceTypeConfig(row.resource_type);
      return h(NTag, { type: config.type, size: "small" }, { default: () => config.text });
    },
  },
  {
    title: "资源",
    key: "resource_name",
    ellipsis: {
      tooltip: true,
    },
    render(row) {
      if (row.platform_name) {
        return h(NFlex, { vertical: true, size: 0 }, [
          h(NEllipsis, { tooltip: true }, { default: () => row.resource_name }),
          h(NText, { depth: 3 }, row.platform_name),
        ]);
      }
      return row.resource_name;
    },
  },
  { title: "问题", key: "last_error", ellipsis: { tooltip: true } },
  {
    title: "时间",
    key: "last_check_at",
    width: 110,
    render(row) {
      return renderDateTime(row.last_check_at);
    },
  },
  {
    title: "操作",
    key: "actions",
    width: 80,
    render(row) {
      return h(
        NButton,
        {
          size: "small",
          onClick: () => handlers.onRecoverIssue(row),
          strong: true,
          secondary: true,
          type: "primary",
        },
        { default: () => "恢复" }
      );
    },
  },
];
