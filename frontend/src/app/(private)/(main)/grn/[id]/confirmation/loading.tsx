export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="text-center">
        <div className="h-8 bg-muted rounded-lg w-64 mx-auto mb-2 animate-pulse"></div>
        <div className="h-5 bg-muted rounded-lg w-48 mx-auto animate-pulse"></div>
      </div>

      {/* Confirmation Card Skeleton */}
      <div className="bg-card rounded-lg border p-8 text-center">
        <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 animate-pulse"></div>
        <div className="h-6 bg-muted rounded w-48 mx-auto mb-2 animate-pulse"></div>
        <div className="h-4 bg-muted rounded w-64 mx-auto animate-pulse"></div>
      </div>

      {/* GRN Details Summary */}
      <div className="bg-card rounded-lg border p-6">
        <div className="h-6 bg-muted rounded w-40 mb-4 animate-pulse"></div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
              <div className="h-5 bg-muted rounded w-32 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Items Summary */}
      <div className="bg-card rounded-lg border p-6">
        <div className="h-6 bg-muted rounded w-36 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="grid grid-cols-4 gap-4 p-3 bg-muted/20 rounded"
            >
              <div className="h-4 bg-muted rounded animate-pulse"></div>
              <div className="h-4 bg-muted rounded animate-pulse"></div>
              <div className="h-4 bg-muted rounded animate-pulse"></div>
              <div className="h-4 bg-muted rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <div className="h-10 bg-muted rounded-md w-32 animate-pulse"></div>
        <div className="h-10 bg-muted rounded-md w-40 animate-pulse"></div>
      </div>
    </div>
  );
}
