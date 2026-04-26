import Logo from "@/components/base/logo";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="animate-pulse">
          <Logo isFull />
        </div>
        <div className="space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading Tether-ERP...</p>
        </div>
      </div>
    </div>
  );
}
