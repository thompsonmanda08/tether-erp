import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRoles,
  getRole,
  getRoleStats,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  getPermissionsByCategory,
  getRoleUsers,
  assignRoleToUsers,
  removeRoleFromUsers,
  cloneRole,
  getRoleAuditHistory,
  type RoleFilters,
  type CreateRoleRequest,
  type UpdateRoleRequest,
} from "@/app/_actions/roles";
import { queryKeys } from "@/lib/query-keys";

// --- Query Hooks ---

export function useRoles(filters?: RoleFilters) {
  return useQuery({
    queryKey: queryKeys.roles.list(filters),
    queryFn: async () => {
      const result = await getRoles(filters);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  });
}

export function useRole(id: string) {
  return useQuery({
    queryKey: queryKeys.roles.detail(id),
    queryFn: async () => {
      const result = await getRole(id);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    enabled: !!id,
  });
}

export function useRoleStats() {
  return useQuery({
    queryKey: queryKeys.roles.stats(),
    queryFn: async () => {
      const result = await getRoleStats();
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: queryKeys.roles.permissions(),
    queryFn: async () => {
      const result = await getPermissions();
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // permissions rarely change
  });
}

export function usePermissionsByCategory() {
  return useQuery({
    queryKey: queryKeys.roles.permissionsByCategory(),
    queryFn: async () => {
      const result = await getPermissionsByCategory();
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRoleUsers(roleId: string) {
  return useQuery({
    queryKey: queryKeys.roles.roleUsers(roleId),
    queryFn: async () => {
      const result = await getRoleUsers(roleId);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    enabled: !!roleId,
  });
}

export function useRoleAuditHistory(roleId: string) {
  return useQuery({
    queryKey: queryKeys.roles.roleAudit(roleId),
    queryFn: async () => {
      const result = await getRoleAuditHistory(roleId);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    enabled: !!roleId,
  });
}

// --- Mutation Hooks ---

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoleRequest) => createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateRoleRequest) => updateRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
}

export function useAssignRoleToUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      userIds,
    }: {
      roleId: string;
      userIds: string[];
    }) => assignRoleToUsers(roleId, userIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.roles.roleUsers(variables.roleId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
}

export function useRemoveRoleFromUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      userIds,
    }: {
      roleId: string;
      userIds: string[];
    }) => removeRoleFromUsers(roleId, userIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.roles.roleUsers(variables.roleId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
}

export function useCloneRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      newName,
      newDisplayName,
    }: {
      roleId: string;
      newName: string;
      newDisplayName: string;
    }) => cloneRole(roleId, newName, newDisplayName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
}
