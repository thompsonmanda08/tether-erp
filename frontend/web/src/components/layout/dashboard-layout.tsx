"use client";

import React from "react";
import { AppSidebar } from "./sidebar/app-sidebar";
import { SidebarInset, useSidebar } from "../ui/sidebar";
import { SiteHeader } from "./header";


interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isMobile, open } = useSidebar();

  // On mobile, sidebar is a Sheet drawer so grid is just 1fr
  // On desktop, sidebar width depends on open state
  // When collapsed on desktop, show icon width (4rem) instead of full width
  const gridColumns = isMobile
    ? "1fr"
    : !open
      ? "4rem 1fr"
      : "var(--sidebar-width) 1fr";

  return (
    <div
      className="  mx-auto w-full relative"
      style={{
        display: "grid",
        gridTemplateColumns: gridColumns,
        minHeight: "100vh",
        transition: "grid-template-columns 200ms ease-linear",
      }}
    >
      {!isMobile && (
        <div
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            zIndex: 40,
            overflow: "hidden",
          }}
        >
          <AppSidebar />
        </div>
      )}
      {isMobile && <AppSidebar />}
      <div className="flex flex-col">
        <SidebarInset className="flex flex-col">
          <SiteHeader />

          <div className="flex-1">
            <div className="@container/main p-4 pb-24 xl:group-data-[theme-content-layout=centered]/layout:container xl:group-data-[theme-content-layout=centered]/layout:mx-auto">
              {children}
            </div>
          </div>
        </SidebarInset>
      </div>


    </div>
  );
}
