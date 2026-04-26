"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Settings,
  XCircle,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ConfigurationRequirement } from "@/hooks/use-configuration-status";
import { cn } from "@/lib/utils";

interface ConfigurationChecklistBannerProps {
  requirements: ConfigurationRequirement[];
  title?: string;
  description?: string;
  variant?: "creation" | "submission";
  className?: string;
}

/**
 * Reusable banner component that displays configuration requirements
 * Shows a checklist of missing configurations with navigation links
 */
export function ConfigurationChecklistBanner({
  requirements,
  title,
  description,
  variant = "creation",
  className,
}: ConfigurationChecklistBannerProps) {
  const router = useRouter();
  const missingRequirements = requirements.filter((req) => !req.isConfigured);
  const isLoading = requirements.some((req) => req.isLoading);

  // Don't show banner if all requirements are met
  if (missingRequirements.length === 0 && !isLoading) {
    return null;
  }

  const defaultTitle =
    variant === "creation"
      ? "Configuration Required"
      : "Additional Configuration Required for Submission";

  const defaultDescription =
    variant === "creation"
      ? "Complete the following configurations to create documents successfully:"
      : "Complete the following configurations to submit documents for approval:";

  return (
    <Alert
      variant="destructive"
      className={cn(
        "border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900",
        className,
      )}
    >
      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
      <AlertTitle className="text-amber-900 dark:text-amber-200 font-semibold text-base mb-3">
        {title || defaultTitle}
      </AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-300">
        <p className="mb-4 text-sm">{description || defaultDescription}</p>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking configuration status...</span>
          </div>
        ) : (
          <div className="space-y-2">
            {requirements.map((requirement) => (
              <div
                key={requirement.id}
                className={cn(
                  "flex items-start justify-between gap-3 p-3 rounded-lg border transition-colors",
                  requirement.isConfigured
                    ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                    : "bg-white border-amber-200 dark:bg-amber-950/10 dark:border-amber-800",
                )}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">
                    {requirement.isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                    ) : requirement.isConfigured ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          "font-medium text-sm",
                          requirement.isConfigured
                            ? "text-green-900 dark:text-green-200"
                            : "text-amber-900 dark:text-amber-200",
                        )}
                      >
                        {requirement.label}
                      </span>
                      {requirement.count !== undefined && (
                        <Badge
                          variant={
                            requirement.isConfigured ? "default" : "secondary"
                          }
                          className={cn(
                            "text-xs",
                            requirement.isConfigured
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
                          )}
                        >
                          {requirement.count} configured
                        </Badge>
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-xs",
                        requirement.isConfigured
                          ? "text-green-700 dark:text-green-400"
                          : "text-amber-700 dark:text-amber-400",
                      )}
                    >
                      {requirement.description}
                    </p>
                  </div>
                </div>

                {!requirement.isConfigured && requirement.navigateTo && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-amber-300 hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/50"
                    onClick={() => router.push(requirement.navigateTo!)}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Configure
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {!isLoading && missingRequirements.length > 0 && (
          <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Note:</strong> You must complete all required
              configurations before you can{" "}
              {variant === "creation" ? "create" : "submit"} documents. Click
              the "Configure" buttons above to set up each requirement.
            </p>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
