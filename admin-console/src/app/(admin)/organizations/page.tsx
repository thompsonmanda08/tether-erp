"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2,
  Users,
  Calendar,
  Eye,
  UserPlus,
  Globe,
  Clock,
  CreditCard,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  type Organization,
  type OrganizationFilters,
} from "@/app/_actions/organizations";
import {
  useOrganizations,
  useOrganizationStats,
  useUpdateOrganizationStatus,
} from "@/hooks/use-organizations";
import { OrganizationDetailsDialog } from "./components/organization-details-dialog";
import { OrganizationActionsDropdown } from "./components/organization-actions-dropdown";
import { OrganizationCreateDialog } from "./components/organization-create-dialog";
import { OrganizationAdvancedFilters } from "./components/organization-advanced-filters";
import { OrganizationBulkActions } from "./components/organization-bulk-actions";

export default function OrganizationsPage() {
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization | null>(null);
  const [showOrganizationDetails, setShowOrganizationDetails] = useState(false);
  const [showCreateOrganization, setShowCreateOrganization] = useState(false);
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>(
    [],
  );

  // Filters and pagination
  const [filters, setFilters] = useState<OrganizationFilters>({
    search: "",
    status: "all",
    page: 1,
    limit: 20,
    sort_by: "created_at",
    sort_order: "desc",
  });

  // TanStack Query hooks
  const {
    data: orgData,
    isLoading,
    error: orgError,
    refetch: refetchOrganizations,
  } = useOrganizations(filters);
  const { data: stats } = useOrganizationStats();
  const updateStatusMutation = useUpdateOrganizationStatus();

  const organizations = orgData?.organizations ?? [];
  const pagination = {
    total: orgData?.total ?? 0,
    page: orgData?.page ?? 1,
    limit: orgData?.limit ?? 20,
    totalPages: orgData?.totalPages ?? 0,
  };

  const statsData = stats ?? {
    total_organizations: 0,
    active_organizations: 0,
    suspended_organizations: 0,
    trial_organizations: 0,
    organizations_created_this_month: 0,
    total_users_across_organizations: 0,
    trials_expiring_soon: 0,
    top_organizations_by_users: [],
  };

  useEffect(() => {
    if (orgError) toast.error("Failed to load organizations");
  }, [orgError]);

  const handleStatusChange = async (
    organizationId: string,
    status: "active" | "suspended" | "pending",
  ) => {
    updateStatusMutation.mutate(
      { id: organizationId, status },
      {
        onSuccess: (result) => {
          if (result.success) {
            toast.success(`Organization ${status} successfully`);
          } else {
            toast.error(
              result.message || "Failed to update organization status",
            );
          }
        },
        onError: () => toast.error("Failed to update organization status"),
      },
    );
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleOrganizationSelection = (
    organizationId: string,
    checked: boolean,
  ) => {
    if (checked) {
      setSelectedOrganizations((prev) => [...prev, organizationId]);
    } else {
      setSelectedOrganizations((prev) =>
        prev.filter((id) => id !== organizationId),
      );
    }
  };

  const handleFiltersChange = (newFilters: OrganizationFilters) => {
    setFilters(newFilters);
  };

  const handleFiltersReset = () => {
    setFilters({
      search: "",
      status: "all",
      page: 1,
      limit: 20,
      sort_by: "created_at",
      sort_order: "desc",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading && organizations.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Organizations
          </h1>
          <p className="text-muted-foreground">
            Manage organizations and workspaces
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-muted animate-pulse rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                  </div>
                  <div className="h-6 w-16 bg-muted animate-pulse rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Organization Management
          </h1>
          <p className="text-muted-foreground">
            Manage all organizations and their settings
          </p>
        </div>
        <Button onClick={() => setShowCreateOrganization(true)}>
          <Building2 className="mr-2 h-4 w-4" />
          Create Organization
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Organizations
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsData.total_organizations}
            </div>
            <p className="text-xs text-muted-foreground">
              +{statsData.organizations_created_this_month} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Organizations
            </CardTitle>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsData.active_organizations}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsData.total_users_across_organizations} total users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsData.total_users_across_organizations}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Suspended Organizations
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsData.suspended_organizations}
            </div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Organizations Management */}
      <Card>
        <CardHeader>
          <CardTitle>All Organizations</CardTitle>
          <CardDescription>
            Manage and support all platform organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Advanced Filters */}
          <OrganizationAdvancedFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleFiltersReset}
          />

          {/* Bulk Actions */}
          <OrganizationBulkActions
            organizations={organizations}
            selectedOrganizations={selectedOrganizations}
            onSelectionChange={setSelectedOrganizations}
            onOrganizationsUpdated={() => {}}
          />

          {/* Organizations List */}
          <div className="space-y-4">
            {organizations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No organizations found matching your criteria
              </div>
            ) : (
              organizations.map((organization) => (
                <div
                  key={organization.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      checked={selectedOrganizations.includes(organization.id)}
                      onCheckedChange={(checked) =>
                        handleOrganizationSelection(
                          organization.id,
                          checked as boolean,
                        )
                      }
                      aria-label={`Select ${organization.name}`}
                    />
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{organization.name}</h3>
                        {getStatusBadge(organization.status)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Globe className="mr-1 h-3 w-3" />
                          {organization.domain}
                        </span>
                        <span className="flex items-center">
                          <Users className="mr-1 h-3 w-3" />
                          {organization.user_count} users
                        </span>
                        <span className="flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          {new Date(organization.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrganization(organization);
                        setShowOrganizationDetails(true);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>

                    <OrganizationActionsDropdown
                      organization={organization}
                      onStatusChange={handleStatusChange}
                      onOrganizationUpdated={() => refetchOrganizations()}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} organizations
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organization Details Dialog */}
      {selectedOrganization && (
        <OrganizationDetailsDialog
          organization={selectedOrganization}
          open={showOrganizationDetails}
          onOpenChange={setShowOrganizationDetails}
          onOrganizationUpdated={() => refetchOrganizations()}
        />
      )}

      {/* Organization Create Dialog */}
      <OrganizationCreateDialog
        open={showCreateOrganization}
        onOpenChange={setShowCreateOrganization}
        onOrganizationCreated={() => refetchOrganizations()}
      />
    </div>
  );
}
