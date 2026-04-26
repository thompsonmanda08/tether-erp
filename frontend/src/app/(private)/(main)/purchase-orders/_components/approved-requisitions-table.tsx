"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRequisitions } from "@/app/_actions/requisitions";
import { Requisition } from "@/types/requisition";
import { QUERY_KEYS } from "@/lib/constants";
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
import {
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { useRouter } from "next/navigation";
import { POCreationWizard } from "./po-creation-wizard";
import { Card } from "@/components/ui/card";
import { usePermissions } from "@/hooks/use-permissions";

interface ApprovedRequisitionsTableProps {
  userId: string;
  userRole: string;
}

export function ApprovedRequisitionsTable({
  userId,
  userRole,
}: ApprovedRequisitionsTableProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit] = useState(5); // Default 5 items per page
  const [selectedRequisition, setSelectedRequisition] =
    useState<Requisition | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch approved requisitions
  const {
    data: requisitions = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEYS.REQUISITIONS.ALL, page, limit, "approved"],
    queryFn: async () => {
      const response = await getRequisitions(page, limit, {
        status: "APPROVED",
      });
      return response.success ? response.data || [] : [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const { hasPermission, isAdmin, isFinance } = usePermissions();

  const canCreatePO =
    hasPermission("purchase_order", "create") || isAdmin() || isFinance();

  const handleCreatePO = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setIsCreateDialogOpen(true);
  };

  const handleViewRequisition = (requisitionId: string) => {
    router.push(`/requisitions/${requisitionId}`);
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (requisitions.length === limit) {
      setPage(page + 1);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">
            Loading approved requisitions...
          </span>
        </div>
      </Card>
    );
  }

  if (!requisitions || requisitions.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No Approved Requisitions
          </h3>
          <p className="text-muted-foreground mb-4">
            There are no approved requisitions available to convert to purchase
            orders.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/requisitions")}
          >
            View All Requisitions
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Approved Requisitions</h3>
              <p className="text-sm text-muted-foreground">
                Select a requisition to create a purchase order
              </p>
            </div>
            <Badge variant="secondary">
              {requisitions.length} requisition
              {requisitions.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Approved Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requisitions.map((requisition) => (
                  <TableRow key={requisition.id}>
                    <TableCell className="font-mono text-sm">
                      {requisition.documentNumber}
                    </TableCell>
                    <TableCell className="font-medium">
                      {requisition.title}
                    </TableCell>
                    <TableCell>{requisition.department}</TableCell>
                    <TableCell className="font-mono">
                      {requisition.currency}{" "}
                      {requisition.totalAmount?.toLocaleString("en-ZM", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>{requisition.items?.length || 0}</TableCell>
                    <TableCell className="text-sm">
                      {requisition.updatedAt
                        ? new Date(requisition.updatedAt).toLocaleDateString(
                            "en-ZM",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewRequisition(requisition.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {canCreatePO &&
                          (() => {
                            const lpo = requisition.linkedPO;
                            if (lpo) {
                              return (
                                <div className="flex items-center gap-2">
                                  <StatusBadge
                                    status={lpo.status}
                                    type="document"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      router.push(`/purchase-orders/${lpo.id}`)
                                    }
                                  >
                                    View PO
                                    <ArrowRight className="h-3 w-3 ml-1" />
                                  </Button>
                                </div>
                              );
                            }
                            return (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleCreatePO(requisition)}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Create PO
                              </Button>
                            );
                          })()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Page {page} • Showing {requisitions.length} of{" "}
              {requisitions.length} requisitions
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={requisitions.length < limit}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Create PO Wizard */}
      {selectedRequisition && (
        <POCreationWizard
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          requisition={selectedRequisition}
        />
      )}
    </>
  );
}
