"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function PrivateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Private route error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 max-w-md px-4">
        <div className="flex justify-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground text-sm">
          An error occurred while loading this page. Your data is safe.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            Ref: {error.digest}
          </p>
        )}
        <Button onClick={reset} size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
