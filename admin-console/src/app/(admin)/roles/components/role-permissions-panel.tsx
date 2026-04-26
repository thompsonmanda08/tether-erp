"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Permission } from "@/app/_actions/roles";

interface RolePermissionsPanelProps {
  permissions: Permission[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function RolePermissionsPanel({
  permissions,
  selectedIds,
  onChange,
}: RolePermissionsPanelProps) {
  const permissionsByCategory = permissions.reduce(
    (acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    },
    {} as Record<string, Permission[]>,
  );

  const getCategoryPermissionCount = (category: string) => {
    const categoryPermissions = permissionsByCategory[category] || [];
    const selectedCount = categoryPermissions.filter((p) =>
      selectedIds.includes(p.id),
    ).length;
    return { selected: selectedCount, total: categoryPermissions.length };
  };

  const isCategoryFullySelected = (category: string) => {
    const { selected, total } = getCategoryPermissionCount(category);
    return selected === total && total > 0;
  };

  const isCategoryPartiallySelected = (category: string) => {
    const { selected, total } = getCategoryPermissionCount(category);
    return selected > 0 && selected < total;
  };

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedIds, permissionId]);
    } else {
      onChange(selectedIds.filter((id) => id !== permissionId));
    }
  };

  const handleCategoryToggle = (category: string, checked: boolean) => {
    const categoryPermissionIds = (
      permissionsByCategory[category] || []
    ).map((p) => p.id);

    if (checked) {
      onChange([...new Set([...selectedIds, ...categoryPermissionIds])]);
    } else {
      onChange(
        selectedIds.filter((id) => !categoryPermissionIds.includes(id)),
      );
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Permissions *</Label>
        <p className="text-xs text-muted-foreground">
          Select permissions for this role ({selectedIds.length} selected)
        </p>
      </div>

      <ScrollArea className="h-96 border rounded-lg">
        <div className="p-4 space-y-4">
          {Object.entries(permissionsByCategory).map(
            ([category, categoryPermissions]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm capitalize">
                      {category.replace(/_/g, " ")}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getCategoryPermissionCount(category).selected}/
                        {getCategoryPermissionCount(category).total}
                      </Badge>
                      <input
                        type="checkbox"
                        checked={isCategoryFullySelected(category)}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate =
                              isCategoryPartiallySelected(category);
                          }
                        }}
                        onChange={(e) =>
                          handleCategoryToggle(category, e.target.checked)
                        }
                        className="rounded border-gray-300"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {categoryPermissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {permission.display_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {permission.description}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(permission.id)}
                          onChange={(e) =>
                            handlePermissionToggle(
                              permission.id,
                              e.target.checked,
                            )
                          }
                          className="rounded border-gray-300"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
