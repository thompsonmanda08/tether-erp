"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createNewUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  resetUserPassword,
  activateUser,
  deactivateUser,
  toggleUserMFA,
} from "@/app/_actions/user-actions";
import { QUERY_KEYS } from "@/lib/constants";
import type {
  CreateUserRequest,
  UpdateUserRequest,
} from "@/app/_actions/user-actions";

/**
 * Hook for creating a new user
 *
 * @param onSuccess - Optional callback function to run on successful creation
 * @returns Mutation object for creating users
 *
 * @example
 * const createMutation = useCreateUser(() => {
 *   router.push('/admin/users');
 * });
 *
 * await createMutation.mutateAsync({
 *   email: 'user@example.com',
 *   password: 'password123',
 *   first_name: 'John',
 *   last_name: 'Doe',
 *   role: 'requester'
 * });
 */
export const useCreateUser = (onSuccess?: (data: any) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserRequest) => {
      const response = await createNewUser(data);
      if (!response.success) {
        throw new Error(response.message || "Failed to create user");
      }
      return response;
    },
    onSuccess: (data) => {
      toast.success("User created successfully");

      // Invalidate all user-related queries to trigger refetch
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.USERS],
      });
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });
      // Also invalidate the specific query pattern used by useUsersQuery
      queryClient.invalidateQueries({
        predicate: (query) => {
          return Array.isArray(query.queryKey) && query.queryKey[0] === "users";
        },
      });
      // Invalidate organization members queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          return (
            Array.isArray(query.queryKey) &&
            (query.queryKey.includes("organization") ||
              query.queryKey.includes("members"))
          );
        },
      });

      onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create user");
    },
  });
};

/**
 * Hook for updating an existing user
 *
 * @param onSuccess - Optional callback function to run on successful update
 * @returns Mutation object for updating users
 *
 * @example
 * const updateMutation = useUpdateUser(() => {
 * });
 *
 * await updateMutation.mutateAsync({
 *   userId: 'user-123',
 *   data: {
 *     first_name: 'Jane',
 *     last_name: 'Smith',
 *     is_active: true
 *   }
 * });
 */
export const useUpdateUser = (onSuccess?: (data: any) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: Partial<UpdateUserRequest>;
    }) => {
      const response = await updateUser(userId, data);
      if (!response.success) {
        throw new Error(response.message || "Failed to update user");
      }
      return response;
    },
    onSuccess: (data, variables) => {
      toast.success("User updated successfully");

      // Invalidate user-related queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.USERS],
      });
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userId],
      });

      onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update user");
    },
  });
};

/**
 * Hook for deleting a user
 *
 * @param onSuccess - Optional callback function to run on successful deletion
 * @returns Mutation object for deleting users
 *
 * @example
 * const deleteMutation = useDeleteUser(() => {
 * });
 *
 * await deleteMutation.mutateAsync('user-123');
 */
export const useDeleteUser = (onSuccess?: (data: any) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await deleteUser(userId);
      if (!response.success) {
        throw new Error(response.message || "Failed to delete user");
      }
      return response;
    },
    onSuccess: (data) => {
      toast.success("User deleted successfully");

      // Invalidate user-related queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.USERS],
      });
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });

      onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete user");
    },
  });
};

/**
 * Hook for toggling user active status
 *
 * @param onSuccess - Optional callback function to run on successful status change
 * @returns Mutation object for toggling user status
 *
 * @example
 * const toggleStatusMutation = useToggleUserStatus(() => {
 * });
 *
 * await toggleStatusMutation.mutateAsync({
 *   userId: 'user-123',
 *   isActive: false
 * });
 */
export const useToggleUserStatus = (onSuccess?: (data: any) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      isActive,
    }: {
      userId: string;
      isActive: boolean;
    }) => {
      const response = await toggleUserStatus(userId, isActive);
      if (!response.success) {
        throw new Error(response.message || "Failed to update user status");
      }
      return response;
    },
    onSuccess: (data, variables) => {
      toast.success(
        `User ${variables.isActive ? "activated" : "deactivated"} successfully`,
      );

      // Invalidate user-related queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.USERS],
      });
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userId],
      });

      onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update user status");
    },
  });
};

/**
 * Hook for activating a user
 *
 * @param onSuccess - Optional callback function to run on successful activation
 * @returns Mutation object for activating users
 *
 * @example
 * const activateMutation = useActivateUser();
 * await activateMutation.mutateAsync('user-123');
 */
export const useActivateUser = (onSuccess?: (data: any) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await activateUser(userId);
      if (!response.success) {
        throw new Error(response.message || "Failed to activate user");
      }
      return response;
    },
    onSuccess: (data, userId) => {
      toast.success("User activated successfully");

      // Invalidate user-related queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.USERS],
      });
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", userId],
      });

      onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to activate user");
    },
  });
};

/**
 * Hook for deactivating a user
 *
 * @param onSuccess - Optional callback function to run on successful deactivation
 * @returns Mutation object for deactivating users
 *
 * @example
 * const deactivateMutation = useDeactivateUser();
 * await deactivateMutation.mutateAsync('user-123');
 */
export const useDeactivateUser = (onSuccess?: (data: any) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await deactivateUser(userId);
      if (!response.success) {
        throw new Error(response.message || "Failed to deactivate user");
      }
      return response;
    },
    onSuccess: (data, userId) => {
      toast.success("User deactivated successfully");

      // Invalidate user-related queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.USERS],
      });
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", userId],
      });

      onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to deactivate user");
    },
  });
};

/**
 * Hook for resetting user password
 *
 * @param onSuccess - Optional callback function to run on successful password reset
 * @returns Mutation object for resetting user passwords
 *
 * @example
 * const resetPasswordMutation = useResetUserPassword(() => {
 * });
 *
 * await resetPasswordMutation.mutateAsync({
 *   userId: 'user-123',
 *   password: 'newPassword123'
 * });
 */
export const useResetUserPassword = (onSuccess?: (data: any) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      password,
    }: {
      userId: string;
      password: string;
    }) => {
      const response = await resetUserPassword(userId, password);
      if (!response.success) {
        throw new Error(response.message || "Failed to reset password");
      }
      return response;
    },
    onSuccess: (data, variables) => {
      toast.success("Password reset successfully");

      // Invalidate user-related queries
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userId],
      });

      onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reset password");
    },
  });
};

/**
 * Hook for toggling user MFA (Multi-Factor Authentication)
 *
 * @param onSuccess - Optional callback function to run on successful MFA toggle
 * @returns Mutation object for toggling user MFA
 *
 * @example
 * const toggleMFAMutation = useToggleUserMFA();
 *
 * await toggleMFAMutation.mutateAsync({
 *   userId: 'user-123',
 *   enabled: true
 * });
 */
export const useToggleUserMFA = (onSuccess?: (data: any) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      enabled,
    }: {
      userId: string;
      enabled: boolean;
    }) => {
      const response = await toggleUserMFA(userId, enabled);
      if (!response.success) {
        throw new Error(response.message || "Failed to toggle MFA");
      }
      return response;
    },
    onSuccess: (data, variables) => {
      toast.success(
        `MFA ${variables.enabled ? "enabled" : "disabled"} successfully`,
      );

      // Invalidate user-related queries
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userId],
      });

      onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to toggle MFA");
    },
  });
};

/**
 * Bulk user operations hook
 * For operations that affect multiple users at once
 *
 * @param onSuccess - Optional callback function to run on successful bulk operation
 * @returns Mutation object for bulk user operations
 *
 * @example
 * const bulkMutation = useBulkUserOperations(() => {
 * });
 *
 * await bulkMutation.mutateAsync({
 *   operation: 'activate',
 *   userIds: ['user-1', 'user-2', 'user-3']
 * });
 */
export const useBulkUserOperations = (onSuccess?: (data: any) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      operation,
      userIds,
    }: {
      operation: "activate" | "deactivate" | "delete";
      userIds: string[];
    }) => {
      const results = [];

      for (const userId of userIds) {
        try {
          let response;
          switch (operation) {
            case "activate":
              response = await activateUser(userId);
              break;
            case "deactivate":
              response = await deactivateUser(userId);
              break;
            case "delete":
              response = await deleteUser(userId);
              break;
            default:
              throw new Error(`Unknown operation: ${operation}`);
          }

          results.push({
            userId,
            success: response.success,
            data: response.data,
          });
        } catch (error) {
          results.push({
            userId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return results;
    },
    onSuccess: (results, variables) => {
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      if (failureCount === 0) {
        toast.success(
          `Successfully ${variables.operation}d ${successCount} user(s)`,
        );
      } else {
        toast.warning(`${successCount} succeeded, ${failureCount} failed`);
      }

      // Invalidate user-related queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.USERS],
      });
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });

      onSuccess?.(results);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Bulk operation failed");
    },
  });
};
