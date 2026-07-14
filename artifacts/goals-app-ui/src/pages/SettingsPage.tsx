import { useAuth } from "@/context/auth";

export function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="px-8 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="rounded-xl border border-(--border) bg-white p-6 space-y-3 text-sm">
        <Row label="Email" value={user?.email ?? "—"} />
        <Row label="Name" value={user?.name ?? "—"} />
        <Row label="Role" value={user?.role ?? "—"} />
        <Row label="API origin" value={import.meta.env.VITE_API_URL ?? "https://api.goals.ac"} />
      </div>
      <p className="text-xs text-(--muted) mt-4">
        AI keys and advanced integration setup are still being ported to the edge app. Use{" "}
        <code className="text-xs">pnpm --filter @workspace/marketing-persona-app run dev</code> locally
        for the full settings experience.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-(--border) pb-2 last:border-0">
      <span className="text-(--muted)">{label}</span>
      <span className="font-medium text-right break-all">{value}</span>
    </div>
  );
}
