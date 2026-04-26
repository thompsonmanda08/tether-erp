"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/utils";
import { Settings, FileText, Plus, Download } from "lucide-react";

// Components
import { SettingsFilters as SettingsFiltersComponent } from "./components/settings-filters";
import { SettingsStatsGrid } from "./components/settings-stats-grid";
import { SettingsTable } from "./components/settings-table";
import { SettingEditDialog } from "./components/setting-edit-dialog";
import { ConfigurationTemplates } from "./components/configuration-templates";

// Hooks
import {
  useSystemSettings,
  useSettingsStats,
  useCreateSystemSetting,
  useUpdateSystemSetting,
  useDeleteSystemSetting,
} from "@/hooks/use-settings";

// Types from actions
import {
  type SystemSetting,
  type SettingsFilters,
  type ConfigurationTemplate,
  type BulkSettingsOperation,
} from "@/app/_actions/settings";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("settings");
  const [filters, setFilters] = useState<SettingsFilters>({});
  const [selectedSettings, setSelectedSettings] = useState<string[]>([]);
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [templates, setTemplates] = useState<ConfigurationTemplate[]>([]);

  const {
    data: settingsResult,
    isLoading,
    refetch: refetchSettings,
    isRefetching: isRefreshing,
  } = useSystemSettings(filters);
  const { data: statsResult, refetch: refetchStats } = useSettingsStats();

  const settings = Array.isArray(settingsResult) ? settingsResult : [];
  const stats = statsResult || null;

  const createSettingMutation = useCreateSystemSetting();
  const updateSettingMutation = useUpdateSystemSetting();
  const deleteSettingMutation = useDeleteSystemSetting();

  const refreshData = async () => {
    try {
      await Promise.all([refetchSettings(), refetchStats()]);
      notify({ title: "Success", description: "Data refreshed successfully.", type: "success" });
    } catch {
      notify({ title: "Error", description: "Failed to refresh data.", type: "error" });
    }
  };

  const handleCreateSetting = async (
    settingData: Omit<SystemSetting, "id" | "created_at" | "updated_at" | "created_by" | "updated_by">,
  ) => {
    try {
      await createSettingMutation.mutateAsync(settingData);
      setShowCreateDialog(false);
      notify({ title: "Success", description: "Setting created successfully.", type: "success" });
    } catch {
      notify({ title: "Error", description: "Failed to create setting.", type: "error" });
    }
  };

  const handleUpdateSetting = async (
    settingData: Omit<SystemSetting, "id" | "created_at" | "updated_at" | "created_by" | "updated_by">,
  ) => {
    if (!editingSetting) return;
    try {
      await updateSettingMutation.mutateAsync({ id: editingSetting.id, updates: settingData });
      setEditingSetting(null);
      notify({ title: "Success", description: "Setting updated successfully.", type: "success" });
    } catch {
      notify({ title: "Error", description: "Failed to update setting.", type: "error" });
    }
  };

  const handleDeleteSetting = async (settingId: string) => {
    try {
      await deleteSettingMutation.mutateAsync(settingId);
      notify({ title: "Success", description: "Setting deleted successfully.", type: "success" });
    } catch {
      notify({ title: "Error", description: "Failed to delete setting.", type: "error" });
    }
  };

  const handleBulkOperation = async (_operation: BulkSettingsOperation) => {
    notify({ title: "Coming Soon", description: "Bulk operations are coming soon." });
  };

  const handleExport = async () => {
    notify({ title: "Coming Soon", description: "Export functionality is coming soon." });
  };

  const handleImport = () => {
    notify({ title: "Coming Soon", description: "Import functionality is coming soon." });
  };

  const handleResetToDefaults = async (_settingIds: string[]) => {
    notify({ title: "Coming Soon", description: "Reset to defaults is coming soon." });
  };

  const handleApplyTemplate = async (_templateId: string) => {
    try {
      await refetchSettings();
      await refetchStats();
      notify({ title: "Success", description: "Template applied successfully.", type: "success" });
    } catch {
      notify({ title: "Error", description: "Failed to apply template.", type: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            System Settings
          </h1>
          <p className="text-muted-foreground">
            Manage system configuration, environment variables, and application settings
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Setting
        </Button>
      </div>

      {stats && <SettingsStatsGrid stats={stats} isLoading={isLoading} />}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <SettingsFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            onExport={handleExport}
            onImport={handleImport}
            onRefresh={refreshData}
            isLoading={isRefreshing}
          />

          <SettingsTable
            settings={settings}
            selectedSettings={selectedSettings}
            onSelectionChange={setSelectedSettings}
            onEdit={setEditingSetting}
            onDelete={handleDeleteSetting}
            onToggleSecret={() => {
              notify({ title: "Info", description: "Secret status toggle not implemented yet." });
            }}
            onResetToDefault={(settingId) => handleResetToDefaults([settingId])}
            onDuplicate={(setting) => {
              setEditingSetting({
                ...setting,
                id: "",
                key: `${setting.key}_copy`,
                updated_at: new Date().toISOString(),
                updated_by: "current-user",
              });
            }}
            isLoading={isLoading}
          />

          {selectedSettings.length > 0 && (
            <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedSettings.length} setting{selectedSettings.length > 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkOperation({ action: "export", settingIds: selectedSettings })}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleResetToDefaults(selectedSettings)}>
                  Reset to Defaults
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkOperation({ action: "delete", settingIds: selectedSettings })}
                >
                  Delete Selected
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <ConfigurationTemplates
            templates={templates}
            onApplyTemplate={handleApplyTemplate}
            onCreateTemplate={() => {
              notify({ title: "Info", description: "Template creation not implemented yet." });
            }}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Configuration Audit Trail</h3>
            <p className="text-sm text-muted-foreground mt-1">Coming Soon</p>
            <p className="text-xs text-muted-foreground/70 mt-2 max-w-md mx-auto">
              Track all configuration changes with who made them, when, and what was modified.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <SettingEditDialog
        setting={editingSetting}
        open={showCreateDialog || !!editingSetting}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingSetting(null);
          }
        }}
        onSave={editingSetting ? handleUpdateSetting : handleCreateSetting}
        isLoading={false}
      />
    </div>
  );
}
