"use client";

import { useQuery } from "@tanstack/react-query";
import { getProvinces, getTowns } from "@/app/_actions/config-actions";
import { queryKeys } from "@/lib/query-keys";

export interface Province {
  id: string;
  name: string;
  code: string;
}

export interface Town {
  id: string;
  provinceId: string;
  name: string;
  code?: string;
}

export const useProvinces = () =>
  useQuery({
    queryKey: queryKeys.config.provinces(),
    queryFn: async () => {
      const r = await getProvinces();
      return (Array.isArray(r.data) ? r.data : []) as Province[];
    },
    staleTime: 24 * 60 * 60 * 1000, // provinces rarely change
  });

/**
 * Fetch towns filtered by province.
 * Pass provinceId = "all" to fetch every town (e.g. for table name resolution).
 * Pass a real UUID to fetch towns for that province (form dropdown).
 * Omit / pass undefined to disable the query.
 */
export const useTowns = (provinceId?: string) =>
  useQuery({
    queryKey: queryKeys.config.towns(provinceId),
    queryFn: async () => {
      const r = await getTowns(provinceId === "all" ? undefined : provinceId);
      return (Array.isArray(r.data) ? r.data : []) as Town[];
    },
    enabled: !!provinceId, // truthy for "all" and any real UUID
    staleTime: 24 * 60 * 60 * 1000,
  });
