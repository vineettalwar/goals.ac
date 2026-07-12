export function MarketingPageSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-background">
      <div className="h-16 border-b border-border bg-secondary/20" />
      <div className="h-[40vh] bg-secondary/30" />
      <div className="mx-auto max-w-5xl px-6 py-16 space-y-6">
        <div className="h-8 w-64 rounded bg-secondary/50" />
        <div className="h-4 w-full max-w-xl rounded bg-secondary/40" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="h-32 rounded-xl bg-secondary/40" />
          <div className="h-32 rounded-xl bg-secondary/40" />
          <div className="h-32 rounded-xl bg-secondary/40" />
        </div>
      </div>
    </div>
  );
}
