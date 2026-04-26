import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],

    // All test files live under the centralized src/__tests__/ tree
    include: ["src/__tests__/**/*.{test,spec}.{ts,tsx}"],

    // Verbose output: show each test name as it runs
    reporters: ["verbose"],

    // Coverage (run with: pnpm test:coverage)
    // Requires: pnpm add -D @vitest/coverage-v8
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/__tests__/**",
        "src/test/**",
        "src/**/*.d.ts",
        "src/components/ui/**", // generated ShadCN primitives
      ],
      thresholds: {
        lines: 60,
        functions: 60,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Stub Next.js server-only sentinel so test env can import server modules
      "server-only": path.resolve(__dirname, "./src/test/server-only.ts"),
    },
  },
});
