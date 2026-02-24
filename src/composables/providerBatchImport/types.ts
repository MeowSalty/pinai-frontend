export type ImportStatus = "待处理" | "导入中" | "成功" | "失败";

export interface KeyFetchResult {
  keyIndex: number;
  keyValue: string;
  status: "pending" | "fetching" | "success" | "failed";
  modelCount?: number;
  error?: string;
  models?: string[];
}

export interface ImportItem {
  id: number;
  line: number;
  rawData: string;
  status: ImportStatus;
  error?: string;
  data?: {
    provider: string;
    variant: string;
    name: string;
    base_url: string;
    apiKeys: string[];
  };
  keyResults?: KeyFetchResult[];
  createError?: string;
}

export interface FlatImportResult {
  key: string;
  provider: string;
  variant: string;
  name: string;
  base_url: string;
  apiKey: string;
  status: ImportStatus;
  message?: string;
  keyIndex?: number;
}

export interface ModelWithKeyIndices {
  name: string;
  alias: string;
  keyIndices: number[];
}
