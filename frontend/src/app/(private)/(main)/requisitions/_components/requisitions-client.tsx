"use client";

import { useState } from "react";
import { PlusCircle as PlusCircledIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/base/page-header";
import { RequisitionsTable } from "./requisitions-table";
import { CreateRequisitionDialog } from "./create-requisition-dialog";
import {
  RequisitionsFilters,
  RequisitionFilters,
} from "./requisitions-filters";
import { Requisition } from "@/types/requisition";

interface RequisitionsClientProps {
  userId: string;
  userRole: string;
  initialData?: Requisition[];
}

export function RequisitionsClient({
  userId,
  userRole,
  initialData,
}: RequisitionsClientProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingRequisition, setEditingRequisition] =
    useState<Requisition | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [filters, setFilters] = useState<RequisitionFilters>({});

  const handleRequisitionCreated = () => {
    setIsCreateDialogOpen(false);
    setIsEditing(false);
    setEditingRequisition(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleCreateNew = () => {
    setIsEditing(false);
    setEditingRequisition(null);
    setIsCreateDialogOpen(true);
  };

  const handleEditRequisition = (requisition: Requisition) => {
    setIsEditing(true);
    setEditingRequisition(requisition);
    setIsCreateDialogOpen(true);
  };

  const handleFiltersChange = (newFilters: RequisitionFilters) => {
    setFilters(newFilters);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Requisitions"
          subtitle="Request and track requisition forms through the approval workflow"
          showBackButton={false}
        />
        <Button onClick={handleCreateNew} className="mt-2 h-11">
            <PlusCircledIcon className="h-4 w-4" />
            Create Requisition
          </Button>
      </div>

      {/* Filters */}
      <RequisitionsFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Requisitions Table */}
      <RequisitionsTable
        userId={userId}
        userRole={userRole}
        refreshTrigger={refreshTrigger}
        onEditRequisition={handleEditRequisition}
        onCreateRequisition={handleCreateNew}
        filters={filters}
        initialData={initialData}
      />

      {/* Create/Edit Dialog */}
      <CreateRequisitionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onRequisitionCreated={handleRequisitionCreated}
        userId={userId}
        editingRequisition={editingRequisition}
        isEditing={isEditing}
      />
    </div>
  );
}
