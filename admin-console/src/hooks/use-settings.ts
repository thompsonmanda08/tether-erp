import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSystemSettings,
  getSystemSetting,
  createSystemSetting,
  updateSystemSetting,
  deleteSystemSetting,
  getEnvironmentVariables,
  getSettingsStats,
  type SystemSetting,
  type SettingsFilters,
} from "@/app/_actions/settings";
import { queryKeys } from "@/lib/query-keys";

// --- Query Hooks ---

export function useSystemSettings(filters?: SettingsFilters) {
  return useQuery({
    queryKey: queryKeys.settings.list(filters),
    queryFn: () => getSystemSettings(filters),
  });
}

export function useSystemSetting(id: string) {
  return useQuery({
    queryKey: queryKeys.settings.detail(id),
    queryFn: () => getSystemSetting(id),
    enabled: !!id,
  });
}

export function useSettingsStats() {
  return useQuery({
    queryKey: queryKeys.settings.stats(),
    queryFn: () => getSettingsStats(),
  });
}

export function useEnvironmentVariables(environment?: string) {
  return useQuery({
    queryKey: queryKeys.settings.envVariables(environment),
    queryFn: () => getEnvironmentVariables(environment),
  });
}

// --- Mutation Hooks ---

export function useCreateSystemSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      setting: Omit<
        SystemSetting,
        "id" | "created_at" | "updated_at" | "created_by" | "updated_by"
      >,
    ) => createSystemSetting(setting),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}

export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<SystemSetting>;
    }) => updateSystemSetting(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}

export function useDeleteSystemSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSystemSetting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}
