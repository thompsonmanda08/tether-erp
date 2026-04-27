"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/base/page-header";
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Workflow as WorkflowIcon,
} from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/status-badge";
import {
  useWorkflows,
  useDeleteWorkflow,
  useDuplicateWorkflow,
  type Workflow,
} from "@/hooks/use-workflow-queries";
import EmptyState from "@/components/base/empty-state";

interface WorkflowsClientProps {
  initialData?: Workflow[];
}

export function WorkflowsClient({ initialData }: WorkflowsClientProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  // Fetch workflows
  const { data: workflows = [], refetch } = useWorkflows({ initialData });

  // Delete workflow mutation
  const deleteMutation = useDeleteWorkflow();

  // Duplicate workflow mutation
  const duplicateMutation = useDuplicateWorkflow();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      // Force refetch to ensure UI updates immediately
      await refetch();
    } catch (error) {
      // Error is already handled by the mutation
    }
  };

  const handleDuplicateClick = (workflowId: string) => {
    setDuplicateId(workflowId);
  };

  const handleDuplicate = async () => {
    if (!duplicateId) return;
    try {
      await duplicateMutation.mutateAsync({ workflowId: duplicateId });
      setDuplicateId(null);
    } catch (error) {
      // Error is already handled by the mutation
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      REQUISITION: "Requisition",
      PURCHASE_ORDER: "Purchase Order",
      PAYMENT_VOUCHER: "Payment Voucher",
      GOODS_RECEIVED_NOTE: "GRN",
      BUDGET: "Budget",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Workflow Management"
          subtitle="Create and manage custom approval workflows"
          showBackButton={false}
        />
        <Link href="/admin/workflows/create">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Workflow
            </Button>
          </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval Workflows</CardTitle>
          <CardDescription>
            Predefined approval proccesses that each document type will require
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workflows?.length === 0 ? (
            <div className="py-12 flex flex-col items-center">
              <EmptyState
                Icon={WorkflowIcon}
                title="No workflows created yet"
                description="Create your first approval workflow to get started with automated document processing"
              />
              <Link href="/admin/workflows/create" className="mt-6">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Workflow
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader className="uppercase bg-muted">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead className="text-center">Stages</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflows &&
                    workflows?.map((workflow) => (
                      <TableRow key={workflow.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{workflow.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {workflow.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getDocumentTypeLabel(
                            workflow.documentType ||
                              workflow.entityType ||
                              "Unknown",
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {workflow.stages?.length || 0}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={
                              (workflow as any).status ||
                              (workflow.isActive ? "active" : "inactive")
                            }
                            type="document"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(workflow.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/admin/workflows/${workflow.id}/edit`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicateClick(workflow.id)}
                              className="gap-2"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(workflow.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The workflow will be permanently
              deleted and any active assignments will be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!duplicateId}
        onOpenChange={() => setDuplicateId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a copy of the workflow with &quot;(Copy)&quot;
              appended to the name. You can edit the duplicate independently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDuplicate}
              disabled={duplicateMutation.isPending}
            >
              {duplicateMutation.isPending ? "Duplicating..." : "Duplicate"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
