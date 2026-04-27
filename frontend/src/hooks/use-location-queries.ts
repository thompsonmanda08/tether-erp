// Geo reference data removed. Stub kept so callers compile; returns empty.

export type Province = { id: string; name: string; code?: string };
export type Town = { id: string; name: string; provinceId: string; code?: string };

export function useProvinces() {
  return { data: [] as Province[], isLoading: false, error: null };
}

export function useTowns(_provinceIdOrAll?: string) {
  return { data: [] as Town[], isLoading: false, error: null };
}
