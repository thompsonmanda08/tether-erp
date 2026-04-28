/**
 * Design tokens — single source of truth for spacing, radius, density.
 * Use these instead of ad-hoc Tailwind values to keep visual rhythm consistent.
 *
 * Brand palette lives in app/hero.ts (HeroUI theme); colors are not duplicated here.
 */

export const spacing = {
  xs: "0.5rem", // 8px  — chip gap, icon gap
  sm: "0.75rem", // 12px — tight stack
  md: "1rem", // 16px — default stack
  lg: "1.5rem", // 24px — section gap, card padding
  xl: "2rem", // 32px — page section gap
  "2xl": "3rem", // 48px — major hero gaps
} as const;

export type SpacingToken = keyof typeof spacing;

export const radius = {
  sm: "6px",
  md: "8px",
  lg: "12px",
  full: "9999px",
} as const;

export type RadiusToken = keyof typeof radius;

export const elevation = {
  none: "none",
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.04)",
  md: "0 2px 8px 0 rgb(0 0 0 / 0.06)",
  lg: "0 8px 24px 0 rgb(0 0 0 / 0.08)",
} as const;

export type ElevationToken = keyof typeof elevation;

/**
 * Density modes for tables, lists, and dense detail views.
 * `compact` for ops surfaces (tasks, approvals).
 * `comfortable` for forms and detail reads.
 */
export const density = {
  compact: { row: "h-10", padX: "px-3", padY: "py-2", text: "text-sm" },
  comfortable: { row: "h-12", padX: "px-4", padY: "py-3", text: "text-sm" },
  spacious: { row: "h-14", padX: "px-6", padY: "py-4", text: "text-base" },
} as const;

export type DensityToken = keyof typeof density;

/**
 * Section gap utility — preferred Tailwind classes for vertical rhythm.
 * Use these instead of mixing `space-y-3`, `gap-4`, etc. across pages.
 */
export const stack = {
  tight: "space-y-2", // 8px
  default: "space-y-4", // 16px
  loose: "space-y-6", // 24px — between sections
  section: "space-y-8", // 32px — between major page regions
} as const;

export type StackToken = keyof typeof stack;
