import { logoutAndRedirect } from "@/app/_actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  LockIcon,
  HomeIcon,
  ShieldAlertIcon,
  BookOpenIcon,
  HelpCircleIcon,
} from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <Card className="w-full max-w-2xl border-2 border-destructive/20 bg-canvas/50">
        <CardContent className="flex flex-col items-center justify-center px-8 py-12">
          {/* Lock Icon */}
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full blur-3xl bg-destructive/10" />
            <div className="relative rounded-2xl border-2 border-destructive/20 bg-canvas p-8">
              <LockIcon
                className="h-20 w-20 text-destructive"
                strokeWidth={1.5}
              />
            </div>
          </div>

          {/* Title and Message */}
          <h1 className="mb-2 text-4xl font-bold text-foreground">
            Access Denied
          </h1>
          <p className="mb-8 max-w-md text-center text-lg text-muted-foreground">
            You don't have permission to access this area. Only administrators
            can view this section.
          </p>

          {/* What Happened */}
          <div className="mb-8 w-full rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlertIcon className="mt-0.5 h-5 w-5 text-warning flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">
                  Why are you seeing this?
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Admin pages are restricted to users with administrator
                  privileges. Your current role is "Requester" which does not
                  have access to administrative features.
                </p>
              </div>
            </div>
          </div>

          {/* Helpful Hints */}
          <div className="mb-8 w-full space-y-3">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <HelpCircleIcon className="h-5 w-5 text-primary" />
              What you can try:
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Hint 1 */}
              <div className="rounded-lg border border-border bg-canvas p-4 hover:border-primary/50 transition-colors">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-xs font-semibold text-primary">
                      1
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">
                    Request Admin Access
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Contact your system administrator or manager to request
                  elevated privileges if you need to manage admin features.
                </p>
              </div>

              {/* Hint 2 */}
              <div className="rounded-lg border border-border bg-canvas p-4 hover:border-primary/50 transition-colors">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-xs font-semibold text-primary">
                      2
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">
                    Check Your Session
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  You might be logged in with the wrong account. Try logging out
                  and signing back in with an admin account.
                </p>
              </div>

              {/* Hint 3 */}
              <div className="rounded-lg border border-border bg-canvas p-4 hover:border-primary/50 transition-colors">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-xs font-semibold text-primary">
                      3
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">
                    Review Documentation
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Check the help documentation to understand the different user
                  roles and their permissions in the system.
                </p>
              </div>

              {/* Hint 4 */}
              <div className="rounded-lg border border-border bg-canvas p-4 hover:border-primary/50 transition-colors">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-xs font-semibold text-primary">
                      4
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">
                    Continue as Requester
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Return to the main dashboard and access features available to
                  your current role level.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 w-full sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/home" className="gap-2">
                <HomeIcon className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/settings" className="gap-2">
                <BookOpenIcon className="h-4 w-4" />
                View Account Settings
              </Link>
            </Button>
          </div>

          {/* Footer Info */}
          <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            <p>
              If you believe this is an error, please{" "}
              <button className="text-primary hover:underline font-semibold">
                contact support
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
