import { PageHeader } from "@/components/base/page-header";

export default function LoadingDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Loading dashboard metrics..."
        showBackButton={false}
      />
      <LoadingDashboard />
    </div>
  );
}

export function LoadingDashboard() {
  return (
    <div className="flex flex-col space-y-2">
      {/* Key Metrics Overview Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass rounded-2xl p-6 text-center">
            <div className="h-8 bg-muted rounded-lg w-16 mx-auto mb-2 animate-pulse"></div>
            <div className="h-5 bg-muted rounded-lg w-24 mx-auto mb-1 animate-pulse"></div>
            <div className="h-4 bg-muted rounded-lg w-20 mx-auto animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Charts Section Skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-muted rounded-lg w-72 mb-6 animate-pulse"></div>

        {/* Chart Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {[1, 2].map((i) => (
            <div key={i} className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="h-6 bg-muted rounded-lg w-48 animate-pulse"></div>
                <div className="h-4 bg-muted rounded-lg w-24 animate-pulse"></div>
              </div>
              <div className="h-[250px] bg-muted rounded-lg animate-pulse flex items-center justify-center">
                <div className="text-muted-foreground">Loading chart...</div>
              </div>
              <div className="mt-4 p-3 bg-card rounded-lg">
                <div className="h-4 bg-muted rounded-lg w-full animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Critical Actions Section Skeleton */}
      <div>
        <div className="h-8 bg-muted rounded-lg w-48 mb-6 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-card border border-border"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-muted rounded-full animate-pulse"></div>
                  <div className="h-5 bg-muted rounded-lg w-32 animate-pulse"></div>
                </div>
                <div className="h-4 bg-muted rounded-lg w-20 animate-pulse"></div>
              </div>
              <div className="h-5 bg-muted rounded-lg w-full mb-2 animate-pulse"></div>
              <div className="h-4 bg-muted rounded-lg w-3/4 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
