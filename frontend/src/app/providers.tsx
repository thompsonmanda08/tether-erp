"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { HeroUIProvider } from "@heroui/react";
import { Toaster } from "sonner";

import { getQueryClient } from "@/lib/query-client";
import { TokenRefreshProvider } from "@/components/auth/token-refresh-provider";
import { TooltipProvider } from "@/components";
import { SessionExpiredModal } from "@/components/auth/session-expired-modal";

export function Providers({ children }: { children: React.ReactNode }) {
  // useState with a lazy initializer ensures the same QueryClient instance is
  // used for every render of this component. On the client getQueryClient()
  // returns the module-level browser singleton, so every hook in the app
  // (useQuery, useMutation, useQueryClient) resolves to this exact instance.
  const [queryClient] = useState(() => getQueryClient());

  return (
    <>
      <HeroUIProvider>
        <NextThemesProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <TokenRefreshProvider>{children}</TokenRefreshProvider>
            </TooltipProvider>
            <SessionExpiredModal />
            <Toaster
              position="top-right"
              expand
              richColors
              theme="system"
              closeButton
            />
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </NextThemesProvider>
      </HeroUIProvider>
    </>
  );
}
