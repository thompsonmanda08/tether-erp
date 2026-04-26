import { useQuery } from "@tanstack/react-query";
import { getAdminDashboardMetrics } from "@/app/_actions/dashboard";
import { queryKeys } from "@/lib/query-keys";

export function useDashboardMetrics() {
  return useQuery({
    queryKey: queryKeys.dashboard.metrics(),
    queryFn: async () => {
      const result = await getAdminDashboardMetrics();
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  });
}
