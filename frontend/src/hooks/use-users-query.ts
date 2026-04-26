"use client";

import {
  createNewUser,
  getUsers,
  getUserById,
  updateUser,
} from "@/app/_actions/user-actions";
import { QUERY_KEYS } from "@/lib/constants";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  avatar?: string;
}

/**
 * Hook to fetch all users with backend API
 */
export function useUsersQuery(
  page: number = 1,
  limit: number = 20,
  filters?: {
    department?: string;
    role?: string;
  }
) {
  return useQuery({
    queryKey: ['users', page, limit, filters],
    queryFn: async () => {
      const response = await getUsers({
        page,
        page_size: limit,
        departmentId: filters?.department,
        role: filters?.role,
      });
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single user by ID with backend API
 */
export function useUserQuery(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await getUserById(userId);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch all users (legacy - mock implementation)
 */
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      // Mock implementation - replace with actual API call
      return Promise.resolve([
        {
          id: "user-001",
          name: "John Requester",
          email: "requester@tether-erp.com",
          role: "REQUESTER",
          department: "Operations",
        },
        {
          id: "user-002",
          name: "Sarah Manager",
          email: "manager@tether-erp.com",
          role: "DEPARTMENT_MANAGER",
          department: "Finance",
        },
        {
          id: "user-003",
          name: "James Finance",
          email: "finance@tether-erp.com",
          role: "FINANCE_OFFICER",
          department: "Finance",
        },
      ] as User[]);
    },
  });
}

/**
 * Hook to fetch a single user by ID (legacy - mock implementation)
 */
export function useUser(userId: string) {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      // Mock implementation - replace with actual API call
      const users = [
        {
          id: "user-001",
          name: "John Requester",
          email: "requester@tether-erp.com",
          role: "REQUESTER",
          department: "Operations",
        },
        {
          id: "user-002",
          name: "Sarah Manager",
          email: "manager@tether-erp.com",
          role: "DEPARTMENT_MANAGER",
          department: "Finance",
        },
      ] as User[];

      return users.find((u) => u.id === userId) || null;
    },
    enabled: !!userId,
  });
}

/**
 * Hook to fetch team members (legacy)
 */
export const _useUsers = (userId: string, params: any) => {
  return useQuery({
    queryKey: [QUERY_KEYS.USERS, userId, params],
    queryFn: userId
      ? async () => await getUserById(userId)
      : async () => await getUsers(params),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

/**
 * Hook to create a new user (legacy)
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createNewUser,
    onSuccess: () => {
      // Invalidate all user queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
    },
  });
};

/**
 * Hook to update an existing user (legacy)
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) =>
      updateUser(userId, data),
    onSuccess: () => {
      // Invalidate all user queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
    },
  });
};

/**
 * Alias for useUsers - commonly used name
 */
export const useGetUsers = useUsers;
