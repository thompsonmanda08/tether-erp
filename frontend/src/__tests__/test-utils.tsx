import { ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Render helper that wraps the UI under a fresh React Query client per test.
 * Use this for any component that calls useQuery / useMutation /
 * useQueryClient — including the new DocumentDetail wrappers.
 */
export function renderWithProviders(
  ui: ReactNode,
  options?: Omit<RenderOptions, "wrapper">,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
    ...options,
  });
}
