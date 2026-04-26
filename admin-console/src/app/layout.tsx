import type { Metadata } from "next";
import React from "react";
import NextTopLoader from "nextjs-toploader";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { Providers } from "./providers";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Tether-ERP | Procurement Module",
    template: "%s | Tether-ERP",
  },
  description:
    "Tether-ERP Procurement Management System. Streamline your procurement processes, manage vendors, purchase orders, and inventory with ease.",
  robots: {
    index: false,
    follow: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn("min-h-screen bg-background font-sans antialiased")}
      >
        <Providers>
          {children}
          <Toaster position="top-center" richColors />
          <NextTopLoader
            color="var(--primary)"
            showSpinner={false}
            height={2}
          />
        </Providers>
      </body>
    </html>
  );
}
