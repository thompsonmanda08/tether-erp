import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminUsers,
  getAdminUser,
  getAdminUserStats,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  activateAdminUser,
  deactivateAdminUser,
  unlockAdminUser,
  resetAdminUserPassword,
  toggleTwoFactor,
  getAdminUserActivity,
  getAdminUserSessions,
  terminateAdminUserSession,
  terminateAllAdminUserSessions,
  getAdminRoles,
  type AdminUserFilters,
  type CreateAdminUserRequest,
  type UpdateAdminUserRequest,
} from "@/app/_actions/admin-users";
import { queryKeys } from "@/lib/query-keys";

// --- Query Hooks ---

export function useAdminUsers(filters?: AdminUserFilters) {
  return useQuery({
    queryKey: queryKeys.adminUsers.list(filters),
    queryFn: async () => {
      const result = await getAdminUsers(filters);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: queryKeys.adminUsers.detail(id),
    queryFn: async () => {
      const result = await getAdminUser(id);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    enabled: !!id,
  });
}

export function useAdminUserStats() {
  return useQuery({
    queryKey: queryKeys.adminUsers.stats(),
    queryFn: async () => {
      const result = await getAdminUserStats();
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  });
}

export function useAdminUserActivity(userId: string, limit = 50) {
  return useQuery({
    queryKey: queryKeys.adminUsers.activity(userId, limit),
    queryFn: async () => {
      const result = await getAdminUserActivity(userId, limit);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    enabled: !!userId,
  });
}

export function useAdminUserSessions(userId: string) {
  return useQuery({
    queryKey: queryKeys.adminUsers.sessions(userId),
    queryFn: async () => {
      const result = await getAdminUserSessions(userId);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    enabled: !!userId,
  });
}

export function useAdminRoles() {
  return useQuery({
    queryKey: queryKeys.adminUsers.roles(),
    queryFn: async () => {
      const result = await getAdminRoles();
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// --- Mutation Hooks ---

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAdminUserRequest) => createAdminUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.all });
    },
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAdminUserRequest) => updateAdminUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.all });
    },
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.all });
    },
  });
}

export function useActivateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateAdminUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.all });
    },
  });
}

export function useDeactivateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateAdminUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.all });
    },
  });
}

export function useUnlockAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unlockAdminUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.all });
    },
  });
}

export function useResetAdminUserPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      sendEmail,
    }: {
      id: string;
      sendEmail?: boolean;
    }) => resetAdminUserPassword(id, sendEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.all });
    },
  });
}

export function useToggleTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      toggleTwoFactor(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.all });
    },
  });
}

export function useTerminateAdminSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      sessionId,
    }: {
      userId: string;
      sessionId: string;
    }) => terminateAdminUserSession(userId, sessionId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.adminUsers.sessions(variables.userId),
      });
    },
  });
}

export function useTerminateAllAdminSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => terminateAllAdminUserSessions(userId),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.adminUsers.sessions(userId),
      });
    },
  });
}
