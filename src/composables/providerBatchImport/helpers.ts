import type { ImportItem } from "./types";

export const cloneImportItems = (items: ImportItem[]): ImportItem[] => {
  return items.map((item) => ({
    ...item,
    data: item.data
      ? {
          ...item.data,
          apiKeys: [...item.data.apiKeys],
        }
      : undefined,
    keyResults: item.keyResults ? item.keyResults.map((result) => ({ ...result })) : undefined,
  }));
};
