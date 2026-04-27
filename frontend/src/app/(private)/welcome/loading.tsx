import { Skeleton } from "@/components/ui/skeleton";
import Logo from "@/components/base/logo";
import { WorkspaceSkeleton } from "./_components/workspace-skeleton";

export default function WelcomeLoadingPage() {
  return (
    <div className="w-full max-w-xl">
      <div className="bg-card rounded-lg p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Logo isFull />
          <div className="flex items-center justify-between pt-4">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>

        {/* Workspace list skeleton */}
        <div className="space-y-4">
          <WorkspaceSkeleton />
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border">
          <Skeleton className="h-3 w-64 mx-auto" />
        </div>
      </div>
    </div>
  );
}
