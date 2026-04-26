"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useOrganizationContext } from "@/hooks/use-organization";
import { USER_ORGS_QUERY_KEY } from "@/hooks/use-user-organizations";
import { logoutAction } from "@/app/_actions/auth";
import {
  switchOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  addOrganizationMember,
  removeOrganizationMember,
  updateOrganizationSettings,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  AddMemberRequest,
  OrganizationSettings,
} from "@/app/_actions/organizations";
import {
  handleOfflineMutation,
  isOfflineResult,
} from "@/lib/offline-mutation-helper";

/**
 * Hook for handling organization selection/switching
 * Manages the flow of switching organizations and navigating to home
 */
export function useSelectOrganization() {
  const router = useRouter();
  const { switchWorkspace } = useOrganizationContext();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const mutation = useMutation({
    mutationFn: async (orgId: string) => {
      await switchWorkspace(orgId);
    },
    onSuccess: () => {
      setIsRedirecting(true);
      router.push("/home");
    },
    onError: () => {
      setIsRedirecting(false);
    },
  });

  return {
    selectOrganization: mutation.mutateAsync,
    isPending: mutation.isPending || isRedirecting,
    error: mutation.error,
  };
}

/**
 * Hook for switching organizations using backend API
 */
export function useSwitchOrganizationMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (orgId: string) => {
      return await switchOrganization(orgId);
    },
    onSuccess: () => {
      // Invalidate all queries to refetch with new organization context
      queryClient.invalidateQueries();
    },
    onError: () => {},
  });

  return {
    switchOrganization: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for creating an organization
 */
export function useCreateOrganizationMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: CreateOrganizationRequest) => {
      return await handleOfflineMutation(
        async () => {
          const response = await createOrganization(data);
          if (!response.success) {
            throw new Error(response.message);
          }
          return response.data;
        },
        {
          operation: "CREATE",
          entity: "organization",
          data,
          successMessage: "Organization created successfully",
          offlineMessage:
            "Organization saved offline. Will sync when connected.",
        },
      );
    },
    onSuccess: (result) => {
      if (isOfflineResult(result)) {
        // Already handled by offline helper
      } else {
        toast.success("Organization created successfully");
      }
      queryClient.invalidateQueries({ queryKey: USER_ORGS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to create organization");
    },
  });

  return {
    createOrganization: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for updating an organization
 */
export function useUpdateOrganizationMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: UpdateOrganizationRequest) => {
      return await handleOfflineMutation(
        async () => {
          const response = await updateOrganization(data);
          if (!response.success) {
            throw new Error(response.message);
          }
          return response.data;
        },
        {
          operation: "UPDATE",
          entity: "organization",
          data,
          entityId: data.id,
          successMessage: "Organization updated successfully",
          offlineMessage:
            "Organization changes saved offline. Will sync when connected.",
        },
      );
    },
    onSuccess: async (result, variables) => {
      if (isOfflineResult(result)) {
        // Already handled by offline helper
      } else {
        toast.success("Organization updated successfully");
      }
      // Invalidate org queries so React Query refetches and updates currentOrganization
      queryClient.invalidateQueries({ queryKey: USER_ORGS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: ["organization", variables.id],
      });
    },
    onError: () => {},
  });

  return {
    updateOrganization: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for adding organization member
 */
export function useAddMemberMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: AddMemberRequest) => {
      const response = await addOrganizationMember(data);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
    },
    onError: () => {},
  });

  return {
    addMember: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for removing organization member
 */
export function useRemoveMemberMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await removeOrganizationMember(userId);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
    },
    onError: () => {},
  });

  return {
    removeMember: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for updating organization settings
 */
export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: OrganizationSettings) => {
      const response = await updateOrganizationSettings(data);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-settings"] });
    },
    onError: () => {},
  });

  return {
    updateSettings: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for deleting an organization
 */
export function useDeleteOrganizationMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async (orgId: string) => {
      return await handleOfflineMutation(
        async () => {
          const response = await deleteOrganization(orgId);
          if (!response.success) {
            throw new Error(response.message);
          }
          return response.data;
        },
        {
          operation: "DELETE",
          entity: "organization",
          data: { orgId },
          entityId: orgId,
          successMessage: "Organization deleted successfully",
          offlineMessage:
            "Organization deletion saved offline. Will sync when connected.",
        },
      );
    },
    onSuccess: (result) => {
      if (isOfflineResult(result)) {
        // Already handled by offline helper
      } else {
        toast.success("Organization deleted successfully");
      }
      queryClient.invalidateQueries({ queryKey: USER_ORGS_QUERY_KEY });

      // Navigate back to welcome screen
      router.push("/welcome");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete organization");
    },
  });

  return {
    deleteOrganization: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for handling user logout
 */
export function useLogout() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async () => {
      await logoutAction();
    },
    onSuccess: () => {
      // Clear all organizational data from localStorage
      if (typeof window !== "undefined") {
        try {
          // Clear organization-specific data
          localStorage.removeItem("current-organization-id");

          // Clear all document storage keys
          const storageKeys = [
            "tether-requisitions",
            "tether-purchase-orders",
            "tether-payment-vouchers",
            "tether-goods-received-notes",
            "tether-budgets",
            "tether-requisition-action-history",
          ];

          storageKeys.forEach((key) => {
            localStorage.removeItem(key);
          });

          // Clear permission cache
          const allKeys = Object.keys(localStorage);
          const permissionKeys = allKeys.filter(
            (key) =>
              key.startsWith("permissions_") ||
              key.startsWith("permissions_expiry_"),
          );
          permissionKeys.forEach((key) => {
            localStorage.removeItem(key);
          });

        } catch {
          // Best-effort localStorage cleanup
        }
      }

      router.push("/login");
    },
    onError: () => {},
  });

  return {
    logout: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
