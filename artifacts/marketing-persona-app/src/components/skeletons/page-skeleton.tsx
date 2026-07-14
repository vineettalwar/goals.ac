export function PageSkeleton() {
  return (
    <div className="px-8 py-8 max-w-5xl space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-secondary" />
        <div className="h-4 w-72 max-w-full rounded bg-secondary/70" />
      </div>
      <div className="paper-card rounded-xl p-6 space-y-4">
        <div className="h-4 w-32 rounded bg-secondary/70" />
        <div className="h-10 w-full rounded-lg bg-secondary" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-10 rounded-lg bg-secondary" />
          <div className="h-10 rounded-lg bg-secondary" />
          <div className="h-10 rounded-lg bg-secondary" />
        </div>
        <div className="h-10 w-36 rounded-lg bg-secondary" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="paper-card rounded-xl h-40 bg-secondary/50" />
        <div className="paper-card rounded-xl h-40 bg-secondary/50" />
      </div>
    </div>
  );
}
