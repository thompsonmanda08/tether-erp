// =============================================================================
// FILE: app/(private)/admin/users/[id]/page.tsx
// =============================================================================
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAdminUserById } from "@/app/_actions/user-actions";
import { UserDetailsClient } from "../../_components/user-details-client";
import { Skeleton } from "@/components/ui/skeleton";

interface UserDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function UserDetailsPage({
  params,
}: UserDetailsPageProps) {
  const { id } = await params;

  // Fetch user data from admin endpoint
  const userResponse = await getAdminUserById(id);

  if (!userResponse.success || !userResponse.data) {
    notFound();
  }

  const user = userResponse.data;

  return (
    <Suspense fallback={<UserDetailsSkeleton />}>
      <UserDetailsClient user={user} />
    </Suspense>
  );
}

function UserDetailsSkeleton() {
  return (
    <>
      {/* Header Skeleton */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-20" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="container mx-auto space-y-6 px-4 py-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </>
  );
}
