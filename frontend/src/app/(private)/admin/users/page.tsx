import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "@/types";
import { PageHeader } from "@/components/base/page-header";
import { getAdminUsers } from "@/app/_actions/user-actions";
import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import CreateUserForm from "../_components/create-user-dialog";
import { UserManagementClient } from "../_components/user-management-client";
import UsersDataTable from "../_components/data-table";

export const metadata = {
  title: "User Management",
  description: "Manage user roles and access permissions",
};

// Disable static generation for this page
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    role?: string;
    department?: string;
    page?: string;
    page_size?: string;
  }>;
};

export default async function UserManagementPage({ searchParams }: PageProps) {
  // Get authenticated user context
  const { session, isAuthenticated } = await verifySession();

  if (!isAuthenticated || !session?.user) {
    redirect("/login");
  }

  const {
    search = "",
    status = "all",
    role = "all",
    department = "all",
    page = "1",
    page_size = "10",
  } = await searchParams;

  const response = await getAdminUsers({
    search: search || undefined,
    status: status !== "all" ? status : undefined,
    role: role !== "all" ? role : undefined,
    page: Number(page),
    limit: Number(page_size),
  });

  const users = (response?.data || []) as User[];

  const rawPagination = response?.pagination;
  const pagination = {
    total: rawPagination?.total ?? 0,
    page: rawPagination?.page ?? 1,
    page_size: rawPagination?.page_size ?? 10,
    total_pages: rawPagination?.total_pages ?? 0,
    has_next: rawPagination?.has_next ?? false,
    has_prev: rawPagination?.has_prev ?? false,
  };

  return (
    <div>
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            title="Users Management"
            subtitle="Manage your team members and their account roles"
          />
          <CreateUserForm user={null} showTrigger role="admin" />
        </div>
      </div>

      <div className="container mx-auto flex flex-col px-4">
        {/* User Management Tabs */}
        <UserManagementClient
          userId={session.user.id}
          userRole={session.user.role}
          usersTabContent={
            <Suspense
              fallback={
                <Card className="shadow-none">
                  <CardContent>
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                        <p className="text-sm text-gray-500">
                          Loading users...
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              }
            >
              <UsersDataTable
                data={users}
                pagination={pagination}
                currentSearch={search}
                currentStatus={status}
                currentRole={role}
                currentDepartment={department}
              />
            </Suspense>
          }
        />
      </div>
    </div>
  );
}
