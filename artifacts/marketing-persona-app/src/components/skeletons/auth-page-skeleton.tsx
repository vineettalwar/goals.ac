export function AuthPageSkeleton() {
  return (
    <div className="paper-card p-8 animate-pulse space-y-4 rounded-xl bg-secondary/40">
      <div className="h-6 w-32 rounded bg-secondary" />
      <div className="h-10 w-full rounded-lg bg-secondary/70" />
      <div className="h-10 w-full rounded-lg bg-secondary/70" />
      <div className="h-10 w-full rounded-lg bg-secondary" />
    </div>
  );
}
