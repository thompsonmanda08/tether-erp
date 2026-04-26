"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useOrganizationContext } from "@/hooks/use-organization";
import { useUserOrganizations } from "@/hooks/use-user-organizations";
import { CreateWorkspace } from "./create-workspace";
import { WorkspaceSelector } from "./workpace-selector";
import type { Organization } from "@/app/_actions/organizations";

interface WelcomeClientProps {
  initialOrganizations?: Organization[];
}

export function WelcomeClient({ initialOrganizations }: WelcomeClientProps) {
  // Hydrate React Query cache with SSR data — prevents loading flash
  useUserOrganizations(initialOrganizations);

  const { refreshOrganizations } = useOrganizationContext();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateSuccess = (organization: any) => {
    refreshOrganizations();
    setShowCreateForm(false);
  };

  return (
    <AnimatePresence mode="wait">
      {showCreateForm ? (
        <CreateWorkspace
          key="create-form"
          onBack={() => setShowCreateForm(false)}
          onSuccess={handleCreateSuccess}
        />
      ) : (
        <WorkspaceSelector
          key="workspace-selector"
          onCreateWorkspace={() => setShowCreateForm(true)}
          showLogo={true}
          showSignOut={true}
        />
      )}
    </AnimatePresence>
  );
}
