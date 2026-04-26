"use client";

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogOut, ShieldAlert } from "lucide-react";
import { logUserOut } from "@/app/_actions/auth";
import { SESSION_EXPIRED_EVENT } from "@/lib/session-events";

export function SessionExpiredModal() {
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logUserOut("Session expired");
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Session Expired
          </AlertDialogTitle>
          <AlertDialogDescription>
            Your session is no longer valid — it may have been terminated from
            another device or by an administrator. Please log in again to
            continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoggingOut}>
            Dismiss
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleLogout(); }}
            disabled={isLoggingOut}
            className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? "Signing out…" : "Log out"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
