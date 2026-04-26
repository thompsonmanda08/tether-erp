import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@/types";
import {
  getAdminUsers as fetchAdminUsers,
  getUserById as fetchAdminUserById,
  createNewUser as createAdminUser,
  updateUser as updateAdminUser,
  deleteUser as deleteAdminUser,
} from "@/app/_actions/user-actions";

const ADMIN_USERS_KEY = ["admin-users"] as const;

interface CreateAdminUserParams {
  email: string;
  username: string;
  password: string;
  name?: string;
  role?: "SUPER_ADMIN" | "ADMIN" | "MODERATOR";
  active?: boolean;
  createdBy?: string;
}

interface UpdateAdminUserParams {
  id: string;
  email?: string;
  username?: string;
  password?: string;
  name?: string;
  role?: "SUPER_ADMIN" | "ADMIN" | "MODERATOR";
  active?: boolean;
}

/**
 * Hook for fetching all admin users
 */
export function useAdminUsers() {
  return useQuery({
    queryKey: ADMIN_USERS_KEY,
    queryFn: async () => {
      const result = await fetchAdminUsers();
      if (!result.success) {
        throw new Error(result.message);
      }
      return result.data;
    },
  });
}

/**
 * Hook for fetching a single admin user by ID
 */
export function useAdminUserById(id: string) {
  return useQuery({
    queryKey: [...ADMIN_USERS_KEY, id],
    queryFn: async () => {
      const result = await fetchAdminUserById(id);
      if (!result.success) {
        throw new Error(result.message);
      }
      return result.data;
    },
  });
}

/**
 * Hook for creating a new admin user
 */
export function useCreateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
    },
  });
}

/**
 * Hook for updating an admin user
 */
export function useUpdateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) => updateAdminUser(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      queryClient.invalidateQueries({ queryKey: [...ADMIN_USERS_KEY, variables.id] });
    },
  });
}

/**
 * Hook for deleting an admin user
 */
export function useDeleteAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
    },
  });
}
