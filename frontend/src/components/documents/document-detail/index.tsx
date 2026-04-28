"use client";

import { cn } from "@/lib/utils";
import { type ReactNode } from "react";
import { Section } from "@/components/ui/section";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { DetailSidebar } from "./sidebar";
import {
  type ActionButton,
  type ActionContext,
  type BodySection,
  type MetadataField,
} from "./types";

export interface DocumentDetailProps<
  TDoc extends { status?: string; documentNumber?: string },
> {
  doc: TDoc;
  title?: string;
  metadataFields: MetadataField<TDoc>[];
  actions: ActionButton<TDoc>[];
  sections: BodySection<TDoc>[];
  context: ActionContext;
  /** Sidebar footer slot (e.g. audit count summary). */
  sidebarFooter?: ReactNode;
  /** Top-of-body slot rendered before sections (e.g. flow indicator banner). */
  topBanner?: ReactNode;
  /** Optional back-button override; default uses router.back(). */
  onBack?: () => void;
  showBack?: boolean;
}

/**
 * Generic document detail page. Split-view: sticky sidebar (left) +
 * scrolling sections (right). Drives all 4 doc types via per-type config.
 *
 * Replaces ~3000 LOC of duplicated detail-clients.
 */
export function DocumentDetail<
  TDoc extends { status?: string; documentNumber?: string },
>({
  doc,
  title,
  metadataFields,
  actions,
  sections,
  context,
  sidebarFooter,
  topBanner,
  onBack,
  showBack = true,
}: DocumentDetailProps<TDoc>) {
  const router = useRouter();
  const visibleSections = sections.filter(
    (s) => !s.condition || s.condition(doc),
  );

  return (
    <div className="space-y-4">
      {showBack && (
        <Button
          variant="light"
          onClick={() => (onBack ? onBack() : router.back())}
          className="-ml-2 h-8 gap-1 px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
      )}

      {topBanner}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <DetailSidebar
          doc={doc}
          title={title}
          metadataFields={metadataFields}
          actions={actions}
          context={context}
          footer={sidebarFooter}
        />

        <div className={cn("min-w-0 flex-1 space-y-6")}>
          {visibleSections.map((section) => (
            <Section
              key={section.id}
              title={section.title}
              icon={section.icon}
              description={section.description}
            >
              {section.render(doc)}
            </Section>
          ))}
        </div>
      </div>
    </div>
  );
}

export type { DocumentTypeKey, ActionButton, BodySection, MetadataField } from "./types";
export { ItemsTable } from "./items-table";
export { DetailSidebar } from "./sidebar";
