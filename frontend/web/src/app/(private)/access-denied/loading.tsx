export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-muted rounded-full mx-auto animate-pulse"></div>
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded w-48 mx-auto animate-pulse"></div>
          <div className="h-5 bg-muted rounded w-64 mx-auto animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-56 mx-auto animate-pulse"></div>
        </div>
        <div className="h-10 bg-muted rounded-md w-32 mx-auto animate-pulse"></div>
      </div>
    </div>
  );
}
