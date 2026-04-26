"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Search,
  Download,
  Eye,
  Users,
  Star,
  Clock,
  Settings,
  Shield,
  Zap,
  Link,
  Bell,
  Palette,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ConfigurationTemplate } from "@/app/_actions/settings";

interface ConfigurationTemplatesProps {
  templates: ConfigurationTemplate[];
  onApplyTemplate: (templateId: string) => void;
  onCreateTemplate: () => void;
  isLoading?: boolean;
}

export function ConfigurationTemplates({
  templates,
  onApplyTemplate,
  onCreateTemplate,
  isLoading = false,
}: ConfigurationTemplatesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<ConfigurationTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const categoryIcons = {
    starter: Settings,
    security: Shield,
    performance: Zap,
    integration: Link,
    notification: Bell,
    ui: Palette,
  };

  const categories = [
    { value: "", label: "All Categories" },
    { value: "starter", label: "Starter Templates" },
    { value: "security", label: "Security" },
    { value: "performance", label: "Performance" },
    { value: "integration", label: "Integration" },
    { value: "notification", label: "Notification" },
    { value: "ui", label: "User Interface" },
  ];

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    const matchesCategory =
      !selectedCategory || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handlePreviewTemplate = (template: ConfigurationTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleApplyTemplate = () => {
    if (selectedTemplate) {
      onApplyTemplate(selectedTemplate.id);
      setShowPreview(false);
      setSelectedTemplate(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-muted animate-pulse rounded w-48" />
          <div className="h-10 bg-muted animate-pulse rounded w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted animate-pulse rounded w-32" />
                <div className="h-4 bg-muted animate-pulse rounded w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-24" />
                  <div className="h-4 bg-muted animate-pulse rounded w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Configuration Templates
          </h2>
          <p className="text-muted-foreground">
            Pre-configured setting templates for quick setup
          </p>
        </div>
        <Button onClick={onCreateTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <SelectField
          placeholder="All Categories"
          options={categories}
          value={selectedCategory}
          onValueChange={setSelectedCategory}
          classNames={{ wrapper: "w-[200px]" }}
        />
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => {
          const CategoryIcon =
            categoryIcons[template.category as keyof typeof categoryIcons] ||
            Settings;

          return (
            <Card
              key={template.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                  {template.isPublic && (
                    <Badge variant="secondary">
                      <Star className="h-3 w-3 mr-1" />
                      Public
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Settings className="h-3 w-3" />
                        <span>{template.settings.length} settings</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>{template.usageCount}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(new Date(template.createdAt), "MMM dd")}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreviewTemplate(template)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onApplyTemplate(template.id)}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Apply
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No templates found</h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedCategory
              ? "No templates match your current filters."
              : "No configuration templates available."}
          </p>
          {!searchTerm && !selectedCategory && (
            <Button onClick={onCreateTemplate} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          )}
        </div>
      )}

      {/* Template Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate && (
                <>
                  {React.createElement(
                    categoryIcons[
                      selectedTemplate.category as keyof typeof categoryIcons
                    ] || Settings,
                    { className: "h-5 w-5" },
                  )}
                  {selectedTemplate.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-6">
              {/* Template Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Category:</span>
                  <span className="ml-2 capitalize">
                    {selectedTemplate.category}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Usage Count:</span>
                  <span className="ml-2">{selectedTemplate.usageCount}</span>
                </div>
                <div>
                  <span className="font-medium">Created:</span>
                  <span className="ml-2">
                    {format(
                      new Date(selectedTemplate.createdAt),
                      "MMM dd, yyyy",
                    )}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Created By:</span>
                  <span className="ml-2">{selectedTemplate.createdBy}</span>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h4 className="font-medium mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedTemplate.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Settings Preview */}
              <div>
                <h4 className="font-medium mb-2">
                  Settings ({selectedTemplate.settings.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedTemplate.settings.map((setting, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{setting.key}</span>
                          {setting.is_required && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                          {setting.is_secret && (
                            <Badge variant="secondary" className="text-xs">
                              Secret
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {setting.type}
                        </Badge>
                      </div>
                      {setting.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {setting.description}
                        </p>
                      )}
                      {setting.default_value && (
                        <p className="text-sm mt-1">
                          <span className="font-medium">Default:</span>{" "}
                          {setting.default_value}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button onClick={handleApplyTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Apply Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
