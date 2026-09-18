import { APP_SHELL_PAGE_WIDE } from "@workspace/app-shell/shell-constants";

export function PageSkeleton() {
  return (
    <div className={`${APP_SHELL_PAGE_WIDE} space-y-8 animate-pulse`}>
      {/* Header section */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-balance h-8 w-48 rounded-lg bg-secondary" />
          <p className="mt-1.5 text-sm text-muted-foreground h-4 w-72 max-w-full rounded bg-secondary/70" />
          <div className="mt-3">
            <div className="h-4 w-32 rounded bg-secondary/70" />
          </div>
        </div>
        <a href="#" className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
          <span className="mr-1.5 h-4 w-4 rounded bg-secondary" />
          <span className="h-4 w-24 rounded bg-secondary" />
        </a>
      </header>

      {/* Main content area */}
      <div className="space-y-10">
        {/* Stats section (when no projects) */}
        <div className="flex flex-col gap-4 border-t border-border py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium h-4 w-32 rounded bg-secondary/70" />
            <p className="mt-0.5 text-sm text-muted-foreground h-4 w-48 rounded bg-secondary/70" />
          </div>
          <a href="#" className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            <span className="mr-1.5 h-4 w-4 rounded bg-secondary" />
            <span className="h-4 w-20 rounded bg-secondary" />
          </a>
        </div>

        {/* When projects exist */}
        <div className="space-y-6">
          {/* Command Center Section */}
          <div className="space-y-4">
            <h2 className="mb-3 text-sm font-semibold h-8 w-32 rounded bg-secondary/70" />
            <div className="grid gap-4">
              {/* Metrics row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="h-8 w-24 rounded bg-secondary/70" />
                <div className="h-8 w-24 rounded bg-secondary/70" />
                <div className="h-8 w-24 rounded bg-secondary/70" />
              </div>
              {/* Autopilot section */}
              <div className="h-16 w-full rounded bg-secondary/70" />
            </div>
          </div>

          {/* Drafts Section */}
          <div className="space-y-4">
            <h2 className="mb-3 text-sm font-semibold h-8 w-48 rounded bg-secondary/70" />
            <ul className="divide-y divide-border border-t border-border space-y-2">
              <li className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate h-4 rounded bg-secondary/70" />
                {"" /* Project name placeholder */}
                <span className="shrink-0 h-4 w-24 rounded bg-secondary/70" />
                <span className="h-3.5 w-3.5 shrink-0 rounded bg-secondary/70" />
              </li>
              <li className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate h-4 rounded bg-secondary/70" />
                {"" /* Project name placeholder */}
                <span className="shrink-0 h-4 w-24 rounded bg-secondary/70" />
                <span className="h-3.5 w-3.5 shrink-0 rounded bg-secondary/70" />
              </li>
              <li className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate h-4 rounded bg-secondary/70" />
                {"" /* Project name placeholder */}
                <span className="shrink-0 h-4 w-24 rounded bg-secondary/70" />
                <span className="h-3.5 w-3.5 shrink-0 rounded bg-secondary/70" />
              </li>
            </ul>
          </div>

          {/* Recent Section */}
          <div className="space-y-4">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="text-sm font-semibold h-8 w-24 rounded bg-secondary/70" />
              <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground h-6 w-24 rounded bg-secondary/70" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-160 text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-left font-medium text-muted-foreground h-4 w-24 rounded bg-secondary/70" />
                    <th className="py-2 pr-4 text-left font-medium text-muted-foreground h-4 w-24 rounded bg-secondary/70" />
                    <th className="py-2 pr-4 text-left font-medium text-muted-foreground h-4 w-16 rounded bg-secondary/70" />
                    <th className="py-2 text-left font-medium text-muted-foreground h-4 w-16 rounded bg-secondary/70" />
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/70">
                    <td className="py-3 pr-4 h-4 w-24 rounded bg-secondary/70" />
                    <td className="py-3 pr-4 h-4 w-24 rounded bg-secondary/70" />
                    <td className="py-3 pr-4 h-4 w-16 rounded bg-secondary/70" />
                    <td className="py-3 tabular-nums h-4 w-16 rounded bg-secondary/70" />
                  </tr>
                  <tr className="border-b border-border/70">
                    <td className="py-3 pr-4 h-4 w-24 rounded bg-secondary/70" />
                    <td className="py-3 pr-4 h-4 w-24 rounded bg-secondary/70" />
                    <td className="py-3 pr-4 h-4 w-16 rounded bg-secondary/70" />
                    <td className="py-3 tabular-nums h-4 w-16 rounded bg-secondary/70" />
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 h-4 w-24 rounded bg-secondary/70" />
                    <td className="py-3 pr-4 h-4 w-24 rounded bg-secondary/70" />
                    <td className="py-3 pr-4 h-4 w-16 rounded bg-secondary/70" />
                    <td className="py-3 tabular-nums h-4 w-16 rounded bg-secondary/70" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Autopilot Activity Panel (compact) */}
          <div className="space-y-4">
            <div className="grid gap-2">
              {/* Status indicators */}
              <div className="flex gap-2">
                <div className="h-6 w-12 rounded bg-secondary/70" />
                <div className="h-6 w-12 rounded bg-secondary/70" />
                <div className="h-6 w-12 rounded bg-secondary/70" />
                <div className="h-6 w-12 rounded bg-secondary/70" />
              </div>
              {/* Metrics */}
              <div className="flex gap-2">
                <div className="h-6 w-16 rounded bg-secondary/70" />
                {"" /* spacer */}
                <div className="h-6 w-16 rounded bg-secondary/70" />
                <div className="h-6 w-16 rounded bg-secondary/70" />
              </div>
            </div>
          </div>

          {/* Projects Section */}
          <div className="space-y-4">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="text-sm font-semibold h-8 w-24 rounded bg-secondary/70" />
              <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground h-6 w-24 rounded bg-secondary/70" />
            </div>
            {"" /* Project link placeholder */}
            <div className="flex items-center gap-2">
              <a href="#" className="block text-sm transition-colors hover:text-primary h-4 w-32 rounded bg-secondary/70" />
              <span className="mt-0.5 block truncate text-muted-foreground h-4 w-32 rounded bg-secondary/70" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
