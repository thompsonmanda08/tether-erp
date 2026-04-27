/**
 * Shared test utilities for the Tether-ERP frontend.
 *
 * Import from this file in tests instead of duplicating setup code:
 *   import { createQueryClientWrapper, renderWithProviders } from "@/test/utils";
 */

import React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// React Query helpers
// ---------------------------------------------------------------------------

/**
 * Returns a React Query wrapper component for use with `renderHook`.
 *
 * @example
 * const { result } = renderHook(() => useMyHook(props), {
 *   wrapper: createQueryClientWrapper(),
 * });
 */
export function createQueryClientWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// ---------------------------------------------------------------------------
// Full render helpers
// ---------------------------------------------------------------------------

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

/**
 * Renders a component inside all standard app providers (React Query, …).
 * Extend this function as new providers are added to the app.
 *
 * @example
 * const { getByText } = renderWithProviders(<MyComponent />);
 */
export function renderWithProviders(
  ui: React.ReactElement,
  { queryClient, ...options }: RenderWithProvidersOptions = {},
) {
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

// ---------------------------------------------------------------------------
// Router mock helpers
// ---------------------------------------------------------------------------

/**
 * Returns a mock Next.js router object for use in tests that need a
 * controllable router without the global vi.mock("next/navigation") setup.
 *
 * @example
 * const router = createMockRouter({ pathname: "/purchase-orders" });
 */
export function createMockRouter(
  overrides: Partial<{
    push: ReturnType<typeof vi.fn>;
    replace: ReturnType<typeof vi.fn>;
    back: ReturnType<typeof vi.fn>;
    prefetch: ReturnType<typeof vi.fn>;
    pathname: string;
  }> = {},
) {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    pathname: "/",
    ...overrides,
  };
}
