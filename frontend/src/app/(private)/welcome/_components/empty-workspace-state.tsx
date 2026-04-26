"use client";

import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyWorkspaceStateProps {
  onCreateWorkspace?: () => void;
  onSignOut?: () => void;
  showSignOut?: boolean;
  isNavigating?: boolean;
}

export function EmptyWorkspaceState({ 
  onCreateWorkspace, 
  onSignOut, 
  showSignOut = true,
  isNavigating = false
}: EmptyWorkspaceStateProps) {
  return (
    <div className="text-center py-12 border border-dashed border-border rounded-lg">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <Building2 className="w-8 h-8 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            No workspaces available
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            You don't have access to any workspaces yet. Create a new workspace to get started.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {onCreateWorkspace && (
            <Button 
              onClick={onCreateWorkspace} 
              className="flex items-center gap-2"
              disabled={isNavigating}
            >
              <Plus className="w-4 h-4" />
              Create workspace
            </Button>
          )}
          
          {showSignOut && onSignOut && (
            <Button 
              onClick={onSignOut} 
              variant="outline"
              disabled={isNavigating}
            >
              Sign Out
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}