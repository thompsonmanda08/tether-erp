/**
 * Reusable loading skeleton for document detail pages
 * Used by: Requisitions, Purchase Orders, Payment Vouchers, GRNs, Budgets
 */
export function DocumentLoadingPage() {
  return (
    <div className="space-y-6">
      {/* Header: Back button + Title + Badges + Action Buttons */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-muted rounded-md animate-pulse" />
            <div className="h-8 bg-muted rounded-lg w-48 animate-pulse" />
            <div className="h-6 bg-muted rounded-full w-20 animate-pulse" />
          </div>
          <div className="h-4 bg-muted rounded w-96 animate-pulse ml-12" />
        </div>
        <div className="flex gap-2 mt-2">
          <div className="h-11 bg-muted rounded-md w-28 animate-pulse" />
          <div className="h-11 bg-muted rounded-md w-32 animate-pulse" />
          <div className="h-11 bg-muted rounded-md w-36 animate-pulse" />
          <div className="h-11 bg-muted rounded-md w-44 animate-pulse" />
        </div>
      </div>

      {/* Document Details - Gradient Card */}
      <div className="gradient-primary border-0 overflow-hidden rounded-lg p-6">
        <div className="h-6 bg-white/20 rounded w-44 mb-6 animate-pulse" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            "w-16",
            "w-24",
            "w-16",
            "w-28",
            "w-28",
            "w-32",
            "w-24",
            "w-24",
            "w-28",
            "w-24",
            "w-20",
            "w-28",
          ].map((labelWidth, i) => (
            <div key={i} className="space-y-2">
              <div
                className={`h-3 bg-white/15 rounded ${labelWidth} animate-pulse`}
              />
              <div className="h-5 bg-white/20 rounded w-32 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Description section */}
        <div className="mt-6 pt-6 border-t border-white/20">
          <div className="h-3 bg-white/15 rounded w-48 mb-3 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 bg-white/20 rounded w-full animate-pulse" />
            <div className="h-4 bg-white/20 rounded w-3/4 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Tabbed Content Card */}
      <div className="bg-card rounded-lg border-0 shadow-sm p-6">
        {/* Tab Bar */}
        <div className="grid grid-cols-5 gap-1 bg-muted rounded-lg p-1 mb-6">
          {["w-20", "w-16", "w-18", "w-16", "w-20"].map((w, i) => (
            <div
              key={i}
              className={`h-9 rounded-md animate-pulse flex items-center justify-center ${
                i === 0 ? "bg-background shadow-sm" : "bg-transparent"
              }`}
            >
              <div className={`h-4 bg-muted rounded ${w} animate-pulse`} />
            </div>
          ))}
        </div>

        {/* Content header */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-muted rounded w-24 animate-pulse" />
          <div className="h-9 bg-muted rounded-md w-28 animate-pulse" />
        </div>

        {/* Item rows */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-start justify-between p-4 rounded-lg border border-slate-200/10"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-muted rounded-full animate-pulse" />
                  <div className="h-5 bg-muted rounded w-48 animate-pulse" />
                </div>
                <div className="ml-8 space-y-1">
                  <div className="flex items-center gap-4">
                    <div className="h-4 bg-muted rounded w-28 animate-pulse" />
                    <div className="h-4 bg-muted rounded w-36 animate-pulse" />
                  </div>
                  <div className="h-3 bg-muted rounded w-24 animate-pulse" />
                </div>
              </div>
              <div className="text-right ml-4 space-y-1">
                <div className="h-6 bg-muted rounded w-28 animate-pulse ml-auto" />
                <div className="h-3 bg-muted rounded w-10 animate-pulse ml-auto" />
              </div>
            </div>
          ))}
        </div>

        {/* Summary footer */}
        <div className="mt-6 pt-6 border-t bg-slate-50 dark:bg-slate-950 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 bg-muted rounded w-24 animate-pulse" />
            <div className="h-4 bg-muted rounded w-20 animate-pulse" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-5 bg-muted rounded w-28 animate-pulse" />
            <div className="h-8 bg-muted rounded w-36 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
