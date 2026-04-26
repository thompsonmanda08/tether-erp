"use client";

import { useQuery } from "@tanstack/react-query";
import { getBranches } from "@/app/_actions/config-actions";
import { queryKeys } from "@/lib/query-keys";

export interface Branch {
  id: string;
  name: string;
  code: string;
  provinceId: string;
  townId: string;
  address?: string;
  isActive: boolean;
}

export const useActiveBranches = () =>
  useQuery({
    queryKey: queryKeys.config.activeBranches(),
    queryFn: async () => {
      const response = await getBranches({ isActive: true, page_size: 100 });
      const data = response.success ? response.data : null;
      return (Array.isArray(data) ? data : []) as Branch[];
    },
    staleTime: 5 * 60 * 1000,
  });
