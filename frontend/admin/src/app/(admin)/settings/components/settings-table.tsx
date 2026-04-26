"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  RotateCcw,
  AlertTriangle,
  Lock,
  Unlock,
  Settings,
  Shield,
  Zap,
  Link,
  Bell,
  Palette,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { SystemSetting } from "@/app/_actions/settings";

interface SettingsTableProps {
  settings: SystemSetting[];
  selectedSettings: string[];
  onSelectionChange: (settingIds: string[]) => void;
  onEdit: (setting: SystemSetting) => void;
  onDelete: (settingId: string) => void;
  onToggleSecret: (settingId: string) => void;
  onResetToDefault: (settingId: string) => void;
  onDuplicate: (setting: SystemSetting) => void;
  isLoading?: boolean;
}

export function SettingsTable({
  settings,
  selectedSettings,
  onSelectionChange,
  onEdit,
  onDelete,
  onToggleSecret,
  onResetToDefault,
  onDuplicate,
  isLoading = false,
}: SettingsTableProps) {
  const [showSecretValues, setShowSecretValues] = useState<
    Record<string, boolean>
  >({});

  const categoryIcons = {
    general: Settings,
    security: Shield,
    performance: Zap,
    integration: Link,
    notification: Bell,
    ui: Palette,
  };

  const typeColors = {
    string: "bg-blue-100 text-blue-800",
    number: "bg-green-100 text-green-800",
    boolean: "bg-purple-100 text-purple-800",
    json: "bg-orange-100 text-orange-800",
    array: "bg-pink-100 text-pink-800",
  };

  const environmentColors = {
    all: "bg-gray-100 text-gray-800",
    production: "bg-red-100 text-red-800",
    staging: "bg-yellow-100 text-yellow-800",
    development: "bg-green-100 text-green-800",
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(settings.map((setting) => setting.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectSetting = (settingId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedSettings, settingId]);
    } else {
      onSelectionChange(selectedSettings.filter((id) => id !== settingId));
    }
  };

  const toggleSecretValue = (settingId: string) => {
    setShowSecretValues((prev) => ({
      ...prev,
      [settingId]: !prev[settingId],
    }));
  };

  const formatValue = (setting: SystemSetting) => {
    if (setting.is_secret && !showSecretValues[setting.id]) {
      return "***HIDDEN***";
    }

    switch (setting.type) {
      case "boolean":
        return setting.value === "true" ? "True" : "False";
      case "json":
        try {
          return JSON.stringify(JSON.parse(setting.value), null, 2);
        } catch {
          return setting.value;
        }
      case "array":
        try {
          const arr = JSON.parse(setting.value);
          return Array.isArray(arr) ? arr.join(", ") : setting.value;
        } catch {
          return setting.value;
        }
      default:
        return setting.value;
    }
  };

  const isAllSelected =
    settings.length > 0 && selectedSettings.length === settings.length;
  const isPartiallySelected =
    selectedSettings.length > 0 && selectedSettings.length < settings.length;

  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </TableHead>
              <TableHead>Setting Key</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Modified</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted animate-pulse rounded w-32" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted animate-pulse rounded w-24" />
                </TableCell>
                <TableCell>
                  <div className="h-6 bg-muted animate-pulse rounded w-16" />
                </TableCell>
                <TableCell>
                  <div className="h-6 bg-muted animate-pulse rounded w-20" />
                </TableCell>
                <TableCell>
                  <div className="h-6 bg-muted animate-pulse rounded w-24" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted animate-pulse rounded w-20" />
                </TableCell>
                <TableCell>
                  <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                ref={(el) => {
                  if (el) {
                    const input = el.querySelector(
                      'input[type="checkbox"]',
                    ) as HTMLInputElement;
                    if (input) input.indeterminate = isPartiallySelected;
                  }
                }}
              />
            </TableHead>
            <TableHead>Setting Key</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Environment</TableHead>
            <TableHead>Modified</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settings.map((setting) => {
            const CategoryIcon =
              categoryIcons[setting.category as keyof typeof categoryIcons] ||
              Settings;

            return (
              <TableRow key={setting.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedSettings.includes(setting.id)}
                    onCheckedChange={(checked) =>
                      handleSelectSetting(setting.id, checked as boolean)
                    }
                  />
                </TableCell>

                <TableCell>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">{setting.key}</span>
                      {setting.is_required && (
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                      )}
                      {setting.is_secret && (
                        <Lock className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                  </div>
                  {setting.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {setting.description}
                    </p>
                  )}
                </TableCell>

                <TableCell>
                  <div className="flex items-center space-x-2 max-w-xs">
                    <div className="truncate">
                      {setting.type === "json" || setting.type === "array" ? (
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {formatValue(setting)}
                        </code>
                      ) : (
                        <span
                          className={cn(
                            setting.type === "boolean" && "font-mono",
                            setting.is_secret &&
                              !showSecretValues[setting.id] &&
                              "text-muted-foreground",
                          )}
                        >
                          {formatValue(setting)}
                        </span>
                      )}
                    </div>
                    {setting.is_secret && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSecretValue(setting.id)}
                        className="h-6 w-6 p-0"
                      >
                        {showSecretValues[setting.id] ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      typeColors[setting.type as keyof typeof typeColors]
                    }
                  >
                    {setting.type}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="flex items-center space-x-2">
                    <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{setting.category}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      environmentColors[
                        setting.environment as keyof typeof environmentColors
                      ]
                    }
                  >
                    {setting.environment === "all"
                      ? "All"
                      : setting.environment}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="text-sm">
                    <div>
                      {format(new Date(setting.updated_at), "MMM dd, yyyy")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(setting.updated_at), "HH:mm")}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(setting)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Setting
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => onDuplicate(setting)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => onResetToDefault(setting.id)}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset to Default
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => onToggleSecret(setting.id)}
                        disabled={!setting.is_secret}
                      >
                        {setting.is_secret ? (
                          <>
                            <Unlock className="mr-2 h-4 w-4" />
                            Make Non-Secret
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Make Secret
                          </>
                        )}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => onDelete(setting.id)}
                        className="text-red-600"
                        disabled={setting.is_required}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Setting
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {settings.length === 0 && (
        <div className="text-center py-12">
          <Settings className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No settings found</h3>
          <p className="text-muted-foreground">
            No settings match your current filters.
          </p>
        </div>
      )}
    </div>
  );
}
